# IOTWORKS DESK — Architecture (v2)

> **Scope**: 재설계된 풀스택 아키텍처. 기존 단일 HTML 데모(`demo/`)의 4가지 구조적 문제
> (유지보수성 / XSS / 데이터 휘발성 / 하드코딩 인증)를 근본적으로 해결한다.
>
> **Status**: Design — 모노레포 스캐폴드 완료. 실제 기능 구현은 로드맵(`docs/ROADMAP.md`) 참조.
>
> **Audience**: 엔지니어, 보안 리뷰어, DevOps.

---

## 1. 재설계 동기 (Problem → Solution)

| # | 문제 (기존 `demo/index.html`) | 재설계 해법 | 구현 위치 |
|---|---|---|---|
| 1 | **유지보수성** — 7,000+줄의 단일 HTML 스파게티 코드. 변경 시 전역 영향. | React 컴포넌트화 + 기능별(feature-based) 폴더 + Tailwind CSS 모듈화 + TypeScript | `apps/web/src/features/**` |
| 2 | **XSS** — `innerHTML` 직접 조작, 사용자 입력 검증 없음. | React 자동 이스케이프 + DOMPurify + 서버측 zod 스키마 검증 + Helmet + CSP 헤더 + Prisma 파라미터화 쿼리 | `apps/api/src/common/validation/*`, `apps/web`(JSX) |
| 3 | **데이터 휘발성** — 모든 상태가 `const ACCOUNTS = [...]` 하드코딩 + `localStorage`. | PostgreSQL 16 + Prisma ORM + NestJS REST API + TanStack Query(서버 상태) + Zustand(UI 상태) | `apps/api`, `apps/web/src/api`, `apps/web/src/store` |
| 4 | **하드코딩 인증** — `email === "admin@..."` 비교. 권한 클라이언트 체크. | JWT(Access 15m / Refresh 7d, httpOnly) + Argon2id 비밀번호 해싱 + NestJS Guard 기반 RBAC + 서버측 권한 강제 + 감사 로그 | `apps/api/src/auth/**` |

---

## 2. 시스템 구성 (High-Level)

```
                 ┌────────────────────────────────────────┐
                 │              Browser (SPA)             │
                 │  ┌──────────────────────────────────┐  │
                 │  │  React 18 + TS + Vite + Tailwind │  │
                 │  │  React Router v6                 │  │
                 │  │  TanStack Query (server state)   │  │
                 │  │  Zustand (UI state)              │  │
                 │  └───────────────┬──────────────────┘  │
                 └──────────────────┼─────────────────────┘
                                    │ HTTPS + JWT (Authorization header)
                                    │ httpOnly refresh cookie
                                    ▼
                 ┌────────────────────────────────────────┐
                 │           NestJS API (apps/api)        │
                 │  ┌──────────────────────────────────┐  │
                 │  │  Guards: JWT → Roles → Perms     │  │
                 │  │  Interceptors: logging, audit    │  │
                 │  │  Validation: zod (class-validator│  │
                 │  │               alt)               │  │
                 │  │  Modules: auth, accounts, homes, │  │
                 │  │    devices, projects, tasks,     │  │
                 │  │    quotes, products, customers,  │  │
                 │  │    audit, notifications, ...     │  │
                 │  └───────────────┬──────────────────┘  │
                 └──────────────────┼─────────────────────┘
                                    │ Prisma Client
                                    ▼
                 ┌─────────────────────┐      ┌──────────────┐
                 │  PostgreSQL 16      │      │  Redis 7     │
                 │  (primary store)    │      │  (sessions,  │
                 │                     │      │   cache,     │
                 │                     │      │   rate limit)│
                 └─────────────────────┘      └──────────────┘
```

---

## 3. 모노레포 구조

```
iw001/
├── apps/
│   ├── web/                  # React + Vite 프론트엔드
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── routes/                # React Router 설정
│   │   │   ├── features/              # 기능별 모듈
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── accounts/
│   │   │   │   ├── homes/
│   │   │   │   ├── devices/
│   │   │   │   ├── projects/
│   │   │   │   ├── quotes/
│   │   │   │   ├── products/
│   │   │   │   ├── customers/
│   │   │   │   ├── audit/
│   │   │   │   └── admin/
│   │   │   ├── components/            # 공통 UI (Button, Modal, Toast, Table)
│   │   │   ├── api/                   # TanStack Query 훅
│   │   │   ├── store/                 # Zustand (theme, sidebar, favorites)
│   │   │   ├── lib/                   # 유틸 (formatters, sanitize, auth)
│   │   │   └── styles/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   └── tsconfig.json
│   │
│   └── api/                  # NestJS 백엔드
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── modules/               # 기능별 모듈
│       │   │   ├── accounts/
│       │   │   ├── homes/
│       │   │   ├── devices/
│       │   │   ├── projects/
│       │   │   ├── quotes/
│       │   │   ├── products/
│       │   │   ├── customers/
│       │   │   ├── audit/
│       │   │   └── notifications/
│       │   ├── auth/                  # JWT + RBAC
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── jwt.strategy.ts
│       │   │   ├── guards/
│       │   │   │   ├── jwt.guard.ts
│       │   │   │   ├── roles.guard.ts
│       │   │   │   └── permissions.guard.ts
│       │   │   └── decorators/
│       │   └── common/                # 예외, 인터셉터, 파이프, 검증
│       │       ├── validation/        # zod 파이프
│       │       ├── interceptors/      # audit-log interceptor
│       │       └── exceptions/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── package.json
│       ├── nest-cli.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/               # 프론트·백엔드 공통
│       ├── src/
│       │   ├── types/                 # 공통 TS 타입
│       │   ├── schemas/               # zod 검증 스키마
│       │   ├── constants/             # ROLES, PERMISSIONS, PAGES
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── infra/
│   ├── docker-compose.yml             # postgres + redis + web + api (dev)
│   ├── Dockerfile.web                 # multi-stage, nginx serve
│   ├── Dockerfile.api                 # multi-stage, node:20-alpine
│   └── nginx.conf
│
├── docs/
│   ├── ARCHITECTURE.md                # 이 문서
│   ├── SECURITY.md                    # 위협 모델 + 보안 컨트롤
│   ├── DATA-MODEL.md                  # ERD + Prisma 스키마 해설
│   ├── API.md                         # REST 엔드포인트
│   └── ROADMAP.md                     # Phase 0 → 5 마이그레이션 계획
│
├── demo/                     # (보존) Phase 0 단일 HTML 데모
├── harness/                  # (보존) 에이전트 오케스트레이션 하네스
│
├── .env.example
├── .gitignore
├── package.json              # 루트 (pnpm workspaces, turbo)
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 4. 해법 상세

### 4.1 유지보수성 — 컴포넌트화

- **React 18 + TypeScript** — 타입 안전성 + 선언적 UI.
- **Feature-based 폴더**: `features/quotes/` 하나에 해당 기능의 `components/`, `hooks/`, `api/`, `types.ts`, `Quotes.page.tsx`를 함께 둠. 기능 삭제 = 폴더 삭제.
- **Tailwind CSS** — 클래스 충돌 없음, 브랜드 컬러(`#EAB308`)는 `tailwind.config.ts`의 `theme.colors.brand`에 정의해 중앙화.
- **React Router v6** — 중첩 라우팅으로 19페이지를 7그룹으로 구조화.
- **Vite** — HMR + ESM + 빠른 빌드.
- **Error Boundary + Suspense** — 부분 실패 격리.
- **ESLint + Prettier + TypeScript strict** — 린트/포맷/타입 체크 CI 필수.

### 4.2 XSS — 안전한 렌더링 + 서버 검증

**프론트엔드**
- React JSX는 모든 텍스트 보간을 자동 이스케이프. `dangerouslySetInnerHTML` **금지** (ESLint 룰로 차단).
- 부득이 HTML을 렌더해야 하면 `DOMPurify.sanitize()` 를 반드시 거침.
- CSP 헤더: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; img-src 'self' data:`
- `Authorization` 헤더는 메모리에만, Refresh Token은 `httpOnly + Secure + SameSite=Strict` 쿠키에.

**백엔드**
- 모든 요청 DTO는 `zod` 스키마로 검증 (`ZodValidationPipe`). 검증 실패 → 400.
- Prisma는 파라미터화 쿼리만 사용. 원시 SQL 사용 시 `Prisma.sql\`...\`` 템플릿 필수.
- `helmet()` 미들웨어로 표준 보안 헤더 자동 설정.
- 파일 업로드는 `multer` + `file-type` 매직 넘버 검사 + 저장 전 임시 격리.

### 4.3 데이터 휘발성 — 영속 계층 + 서버 상태 동기화

**데이터베이스**
- **PostgreSQL 16** (primary). Prisma로 스키마 선언, 마이그레이션 자동 생성.
- **Redis 7** — 세션/토큰 블랙리스트, rate limit 카운터, 뷰 캐시.
- **주요 모델** (상세는 `docs/DATA-MODEL.md`):
  User, Account, Home, Device, TelemetrySample, Project, Task, Quote, QuoteItem,
  Product, Customer, MaintenanceSchedule, AsTicket, Notification, ApprovalRequest,
  AuditLog, Permission, RolePermission.

**API**
- **NestJS + REST** (GraphQL은 Phase 2 옵션).
- 기능당 1 모듈: `controller` → `service` → `repository (Prisma)`.
- 페이징/필터/정렬은 공통 쿼리 파이프(`@Paginate()`)로 일관화.
- **표준 에러 포맷**: `{ error: { code, message, details? } }`.

**프론트엔드 상태**
- **TanStack Query** — 서버 상태(쿼리, 뮤테이션, 낙관적 업데이트, 자동 재검증).
- **Zustand** — UI 전용(테마, 사이드바 열림, 즐겨찾기, 메뉴 순서) + localStorage 영속화 미들웨어.
- 서버 상태를 Zustand에 복제하지 않음 (SSoT 원칙).

### 4.4 인증·인가 — JWT + RBAC + 감사

**인증 플로우**
1. `POST /auth/login` → 이메일 + 비밀번호 (Argon2id 검증)
2. 성공 시 Access Token(JWT, 15분) + Refresh Token(JWT, 7일, httpOnly 쿠키) 발급
3. Access Token 페이로드: `{ sub, email, role, permissions[], iat, exp }`
4. Access 만료 시 `POST /auth/refresh` → Refresh 쿠키로 새 Access 발급
5. 로그아웃 시 Refresh 토큰을 Redis 블랙리스트에 추가, 쿠키 삭제

**인가(RBAC + ABAC 혼합)**
- 4개 역할: `admin`, `manager`, `engineer`, `viewer` (기획서 1.3)
- 19개 페이지별 권한 매트릭스 (기획서 5.2): `Permission` 테이블에 `(role, pageId, action)` 저장
- NestJS Guard 체인:
  1. `JwtAuthGuard` — 토큰 검증
  2. `RolesGuard` — `@Roles('admin','manager')` 데코레이터 체크
  3. `PermissionsGuard` — `@RequirePermission('quotes:write')` 체크
- **클라이언트 체크는 UX용에 불과**: 모든 권한은 서버에서 최종 강제.

**비밀번호 정책**
- Argon2id (`@node-rs/argon2`), `memoryCost=64MB, timeCost=3, parallelism=4`
- 최소 12자, 대·소·숫·특수 중 3종 이상
- 로그인 5회 실패 시 계정 15분 잠금 (Redis 카운터)
- 관리자 초기 비밀번호는 최초 로그인 시 강제 변경

**감사 로그**
- 모든 상태 변경(POST/PATCH/DELETE) 요청은 `AuditInterceptor` 가 자동 기록
- 기록 필드: `userId, ip, ua, method, path, resource, resourceId, action, before, after, at`
- 권한 변경·삭제는 특별히 `severity=high` 로 표시

---

## 5. 핵심 비기능 요구사항 (NFR)

| 항목 | 목표 |
|---|---|
| 응답 시간 (p95) | API 200ms 이하 (읽기), 500ms 이하 (쓰기) |
| 가용성 | 99.5% (개발 단계), 99.9% (프로덕션) |
| 복원력 | DB 장애 시 API는 readonly 모드로 degrade |
| 관측성 | Pino 구조화 로그 + OpenTelemetry trace + Prometheus metrics |
| 브라우저 지원 | 최신 2개 메이저 버전 Chrome/Edge/Safari/Firefox |
| 접근성 | WCAG 2.1 AA (키보드 네비, ARIA, 명도대비 4.5:1) |
| i18n | 한국어 기본, 영어 Phase 2 |

---

## 6. 배포 토폴로지 (Phase 1 목표)

- **개발**: `docker compose up` → postgres + redis + api + web 모두 로컬 실행
- **스테이징/프로덕션**:
  - 웹: 정적 빌드 → CDN (Cloudflare/S3+CloudFront)
  - API: 컨테이너 오케스트레이터 (ECS/Kubernetes)
  - DB: 매니지드 PostgreSQL (RDS/Cloud SQL)
  - Redis: 매니지드 (ElastiCache/MemoryStore)
- **비밀**: AWS Secrets Manager 또는 Vault. `.env` 는 개발 전용.

---

## 7. 호환성 / 점진적 마이그레이션

기존 자산을 버리지 않고 단계적으로 이행한다:

- `demo/` — **Phase 0 참고 구현**. 새 UI가 19페이지를 모두 대체할 때까지 링크 유지.
- `harness/` — **에이전트 오케스트레이션 하네스**. 새 `apps/web`, `apps/api`, `prisma`, `infra`, `tests` 경로에 맞게 `harness/agents/*.agent.ts` 의 `allowedPaths` 를 업데이트(`docs/ROADMAP.md` 참고).

---

## 8. 열려 있는 결정 (ADR 후보)

1. **GraphQL 도입 시점** — 페이지 쿼리 복잡도가 N+1 문제를 일으키면 Phase 2에서 검토.
2. **리얼타임 채널** — 기기 온라인 상태 → WebSocket vs SSE. `apps/api/src/modules/telemetry` 에서 실험.
3. **상태 공유 DB 대안** — 다중 동시 편집이 필요하면 Yjs CRDT 도입 (기획서 8.2).
4. **MFA** — Phase 2에서 TOTP 도입 검토.

---

**끝.** 상세 보안 통제는 `docs/SECURITY.md`, 데이터 모델은 `docs/DATA-MODEL.md`, 로드맵은 `docs/ROADMAP.md` 참조.
