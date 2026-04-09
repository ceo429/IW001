# IOTWORKS DESK — Security

> 본 문서는 재설계된 시스템의 **위협 모델 + 보안 통제**를 정리한다.
> 원본 문제 (기존 `demo/index.html`): XSS 노출, `innerHTML` 직접 삽입, 하드코딩된 계정 비교,
> 권한의 클라이언트 체크 등.

---

## 1. 위협 모델 (STRIDE 요약)

| # | 위협 | 예시 | 통제 |
|---|---|---|---|
| S | Spoofing | 타인 계정 도용 | Argon2id 비밀번호 + JWT 서명 + httpOnly Refresh 쿠키 + Rate limit + 계정 잠금 |
| T | Tampering | 견적 금액 조작 | 서버측 재계산 + zod 스키마 검증 + Prisma 트랜잭션 + 감사 로그 |
| R | Repudiation | "내가 안 했다" | `AuditLog` 테이블(userId, ip, ua, before/after, at) + 무결성 해시 체인 (Phase 2) |
| I | Info Disclosure | 에러 메시지에 스택/쿼리 노출 | `NODE_ENV=production` 시 스택 숨김 + 공통 예외 필터 + 민감 컬럼(`passwordHash`) `@Exclude` |
| D | Denial of Service | 무한 쿼리/로그인 폭주 | `@nestjs/throttler` rate limit + body size 제한 + 복잡 쿼리 페이징 강제 |
| E | Elevation of Privilege | viewer 가 admin API 호출 | `JwtAuthGuard → RolesGuard → PermissionsGuard` 체인 + 서버 최종 강제 |

---

## 2. 인증 (Authentication)

### 2.1 비밀번호
- **해시 알고리즘**: Argon2id (`@node-rs/argon2`)
  - `memoryCost: 19 * 1024` (19 MiB), `timeCost: 2`, `parallelism: 1` (OWASP 2024 권장)
- **정책**:
  - 최소 12자
  - 대문자 / 소문자 / 숫자 / 특수문자 중 **3종 이상**
  - 최근 사용 비밀번호 5개 재사용 금지 (Phase 2)
- **초기 비밀번호** (관리자가 계정 생성 시): 최초 로그인 시 강제 변경 플래그
- **잠금**: 5회 실패 → 15분 잠금 (Redis 카운터)

### 2.2 토큰
- **Access Token (JWT)**
  - 만료 15분
  - 페이로드: `{ sub, email, role, permissions[], iat, exp, jti }`
  - 서명 알고리즘: `RS256` (비대칭, Phase 2로 `HS256` → `RS256` 전환 옵션)
  - 전송: `Authorization: Bearer <token>` 헤더
  - 저장: **메모리 전용** (localStorage/sessionStorage **금지** — XSS 탈취 방지)

- **Refresh Token (JWT)**
  - 만료 7일
  - 페이로드: `{ sub, jti, iat, exp }`
  - 저장: `httpOnly; Secure; SameSite=Strict; Path=/auth/refresh` 쿠키
  - 교체 정책: **Refresh token rotation** (사용 시 새 Refresh 발급, 구 토큰 블랙리스트)
  - 도난 탐지: 동일 `jti` 재사용 탐지 시 해당 사용자 모든 세션 무효화

- **블랙리스트**: Redis `SET token:blacklist:<jti>` with TTL = 토큰 남은 수명

### 2.3 MFA (Phase 2)
- TOTP (RFC 6238), QR 등록, 백업 코드 10개
- 관리자는 강제, 그 외는 선택

---

## 3. 인가 (Authorization)

### 3.1 역할 (Role)
```ts
// packages/shared/src/constants/roles.ts
export const ROLES = {
  admin:    { label: '최고관리자', rank: 100 },
  manager:  { label: '매니저',     rank: 80  },
  engineer: { label: '엔지니어',   rank: 60  },
  viewer:   { label: '뷰어',       rank: 20  },
} as const;
```

### 3.2 권한 매트릭스 (19페이지 × 4역할)
- `packages/shared/src/constants/permissions.ts` 에 기본 매트릭스 정의
- DB 테이블 `Permission(role, pageId, canRead, canWrite, canDelete)` 가 런타임 최종 권위
- 관리자는 매트릭스를 UI에서 수정 가능 (감사 로그 필수)

### 3.3 Guard 체인 (NestJS)
```ts
// apps/api/src/modules/quotes/quotes.controller.ts 예시
@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class QuotesController {
  @Post()
  @Roles('admin', 'manager')
  @RequirePermission('quotes', 'write')
  create(@Body(new ZodValidationPipe(createQuoteSchema)) dto: CreateQuoteDto) { ... }
}
```

1. `JwtAuthGuard` — Bearer 토큰 검증, `req.user` 세팅
2. `RolesGuard` — 역할 화이트리스트 체크
3. `PermissionsGuard` — DB `Permission` 테이블 조회 후 `canWrite` 확인
4. 모든 단계 실패 시 `403 Forbidden`

### 3.4 클라이언트 체크는 UX 보조
- React 라우터 가드 (`<RequireRole role="admin">`)는 메뉴 숨김 등 UX 목적
- **서버측 Guard 가 최종 권위**. 프론트를 우회해도 API 거부.

---

## 4. 입력 검증 (XSS / SQLi / 기타)

### 4.1 서버측 (1차 방어선)
- **zod 스키마**로 모든 DTO 검증
  ```ts
  // packages/shared/src/schemas/quote.schema.ts
  export const createQuoteSchema = z.object({
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      qty: z.number().int().positive().max(10000),
      unitPrice: z.number().nonnegative(),
      discount: z.number().min(0).max(100),
    })).min(1).max(500),
    validUntil: z.string().datetime(),
  });
  ```
- **Prisma** 는 기본적으로 파라미터화 쿼리. 원시 SQL 사용 시 `Prisma.sql\`\`` 템플릿 강제.
- 파일 업로드: 크기 제한 + `file-type` 매직 넘버 검사 + 허용 MIME 화이트리스트.

### 4.2 클라이언트측 (2차 방어선)
- React JSX 자동 이스케이프 — 텍스트 노드는 안전.
- `dangerouslySetInnerHTML` **금지**. 필요 시 반드시 `DOMPurify.sanitize()` 선처리.
- URL 파라미터 렌더링 시 `encodeURIComponent`.
- 외부 링크는 `rel="noopener noreferrer"` 강제.

### 4.3 ESLint 규칙 강제
```json
{
  "rules": {
    "react/no-danger": "error",
    "react/jsx-no-target-blank": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-eval": "error",
    "no-implied-eval": "error"
  }
}
```

---

## 5. 전송 보안

- **HTTPS 전용** (프로덕션). HTTP → HTTPS 리다이렉트 + HSTS(`max-age=31536000; includeSubDomains; preload`)
- **TLS 1.2+** (1.0/1.1 비활성화)
- **Helmet** 기본 헤더:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 0` (레거시, 최신 브라우저는 CSP 사용)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

- **CSP (Content Security Policy)** — `apps/web` 정적 호스팅 단에서 설정:
  ```
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  font-src 'self' https://cdn.jsdelivr.net;
  img-src 'self' data: blob:;
  connect-src 'self' https://api.iotworks.kr wss://api.iotworks.kr;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  ```

- **CORS** — 화이트리스트 도메인만 허용. credentials 필요 시 `*` 금지.

---

## 6. 레이트 리밋 / 봇 방어

| 엔드포인트 | 제한 | 저장소 |
|---|---|---|
| `POST /auth/login` | 5 req / 15 min / IP+email | Redis |
| `POST /auth/refresh` | 60 req / 1 min / IP | Redis |
| 일반 API | 600 req / 1 min / user | Redis |
| 공개 읽기 | 1200 req / 1 min / IP | Redis |

- `@nestjs/throttler` + `ThrottlerStorageRedisService` 사용
- 로그인 실패 5회 누적 시 계정 15분 잠금 (엔드포인트와 별개)

---

## 7. 비밀 관리

- 로컬: `.env` (gitignore), `.env.example` 만 커밋
- 프로덕션: AWS Secrets Manager / Vault / Kubernetes Secret
- **코드에 비밀 금지** — 프리커밋 훅으로 `gitleaks` 스캔 (Phase 2)
- 이메일·API 키 로테이션 주기 90일

---

## 8. 로깅 / 감사

### 8.1 구조화 로그
- **Pino** JSON 로그. 민감 필드 자동 리다크션: `password, token, authorization, cookie`
- 레벨: prod=info, staging=debug
- 로그 레이크 수집 (Loki/CloudWatch)

### 8.2 감사 로그 테이블
```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  ip         String
  userAgent  String
  method     String   // GET/POST/PATCH/DELETE
  path       String
  resource   String   // e.g. "quote"
  resourceId String?
  action     String   // create/update/delete/login/logout/permission-change
  severity   String   @default("normal") // normal | high
  before     Json?
  after      Json?
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
  @@index([resource, resourceId])
}
```

- 권한 변경, 계정 삭제, 견적 승인 등은 `severity="high"`
- 관리자 UI 에서 필터·검색·CSV 내보내기 제공
- **무결성**: 향후 Merkle chain 으로 위변조 탐지 (Phase 2)

---

## 9. 의존성 보안

- `pnpm audit` CI 필수 (high 이상 배포 차단)
- Dependabot / Renovate 자동 PR
- 공급망 공격 방어: `pnpm install --frozen-lockfile --ignore-scripts` (scripts 는 allowlist 만)

---

## 10. 사고 대응

- **계정 탈취 탐지**: Refresh 토큰 재사용, IP/UA 급변, 지리적 이상
- **대응 절차**:
  1. 해당 사용자 모든 세션 강제 로그아웃 (`DELETE /auth/sessions/:userId`)
  2. 비밀번호 리셋 링크 발송
  3. `severity=high` 감사 로그
  4. 관리자 알림
- **유출 시**: 법적 통지 기한 준수, 영향 범위 재빌드, 키 로테이션

---

## 11. 체크리스트 (릴리스 전)

- [ ] 모든 엔드포인트에 Guard 적용 확인 (`@Public()` 명시 제외)
- [ ] 모든 DTO 가 zod 스키마를 통과
- [ ] `dangerouslySetInnerHTML` 그렙 결과 0건
- [ ] CSP 헤더 배포 환경에서 검증
- [ ] `.env` 파일 커밋 여부 재확인
- [ ] `pnpm audit` 결과 high 0건
- [ ] 관리자 기본 비밀번호 제거
- [ ] Rate limit 동작 확인 (`hey` / `k6`)
- [ ] Refresh token rotation 동작 확인
- [ ] 감사 로그가 권한 변경을 캡처하는지 확인

---

**끝.**
