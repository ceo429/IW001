# IOTWORKS DESK — REST API

> **Base URL**: `https://api.iotworks.kr/v1` (프로덕션) / `http://localhost:3000/v1` (로컬)
>
> **Auth**: `Authorization: Bearer <jwt>` (대부분의 엔드포인트)
> **Content-Type**: `application/json; charset=utf-8`
> **Error Format**: `{ "error": { "code": "...", "message": "...", "details"?: {...} } }`
>
> 모든 엔드포인트는 NestJS Guard 체인(`JwtAuthGuard → RolesGuard → PermissionsGuard`)을 통과한다.
> 권한 미달 시 `403 { error: { code: "FORBIDDEN", ... } }`.

---

## 1. 공통 규칙

### 1.1 페이징
```
GET /quotes?page=1&pageSize=20&sort=-createdAt&filter[status]=draft
```
- `page` (1-based), `pageSize` (기본 20, 최대 100)
- `sort` — `field` 또는 `-field` (desc)
- `filter[field]` — 동등 매칭
- 응답:
  ```json
  {
    "data": [...],
    "pagination": { "page": 1, "pageSize": 20, "total": 142, "pageCount": 8 }
  }
  ```

### 1.2 에러 코드
| HTTP | code | 의미 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | zod 검증 실패 (`details` 에 필드별 메시지) |
| 401 | `UNAUTHENTICATED` | JWT 없음/만료 |
| 403 | `FORBIDDEN` | 역할/권한 부족 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 중복/무결성 위반 |
| 422 | `BUSINESS_RULE_VIOLATION` | 예: 재고 부족으로 수주 전환 불가 |
| 429 | `RATE_LIMITED` | 레이트 리밋 초과 |
| 500 | `INTERNAL_ERROR` | 서버 오류 (스택은 감춤) |

### 1.3 멱등성
변경 API(`POST/PATCH/DELETE`)는 선택적 `Idempotency-Key` 헤더 지원(Phase 2). 네트워크 재시도 시 중복 생성 방지.

---

## 2. 인증 (`/auth`)

| Method | Path | Auth | Role | 설명 |
|---|---|---|---|---|
| POST | `/auth/login` | public | — | 이메일+비밀번호 로그인. 성공 시 Access 반환 + Refresh 쿠키 셋. |
| POST | `/auth/refresh` | refresh cookie | — | Access 재발급. Refresh 토큰 로테이션. |
| POST | `/auth/logout` | JWT | all | Refresh 세션 무효화. |
| POST | `/auth/change-password` | JWT | all | 본인 비밀번호 변경. 정책 검증. |
| GET  | `/auth/me` | JWT | all | 현재 사용자 + 권한 요약. |
| POST | `/auth/forgot` | public | — | 비밀번호 리셋 링크 발송 (이메일). |
| POST | `/auth/reset` | reset token | — | 리셋 토큰으로 비밀번호 재설정. |

### 예시: 로그인
```http
POST /v1/auth/login
Content-Type: application/json

{ "email": "admin@iotworks.kr", "password": "<plain>" }
```
```json
// 200
{
  "accessToken": "eyJhbGciOi...",
  "user": {
    "id": "...", "email": "...", "name": "홍길동",
    "role": "admin", "permissions": ["*:*"]
  }
}
// Set-Cookie: rt=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/v1/auth/refresh
```

---

## 3. 사용자 / 권한 (`/users`, `/permissions`)

| Method | Path | Role |
|---|---|---|
| GET    | `/users` | admin, manager |
| POST   | `/users` | admin |
| GET    | `/users/:id` | admin, manager |
| PATCH  | `/users/:id` | admin |
| DELETE | `/users/:id` | admin |
| POST   | `/users/:id/reset-password` | admin |
| POST   | `/users/:id/lock` | admin |
| POST   | `/users/:id/unlock` | admin |
| GET    | `/permissions` | admin, manager |
| PATCH  | `/permissions` | admin |

### 권한 매트릭스 업데이트
```http
PATCH /v1/permissions
{
  "changes": [
    { "role": "engineer", "pageId": "quotes", "canRead": true, "canWrite": false }
  ]
}
```
- 서버는 변경 내역을 `AuditLog(severity=high)` 에 기록.

---

## 4. 고객 / 장소 / 기기

| Method | Path | Role |
|---|---|---|
| GET    | `/customers` | all |
| POST   | `/customers` | admin, manager |
| GET    | `/customers/:id` | all |
| PATCH  | `/customers/:id` | admin, manager |
| DELETE | `/customers/:id` | admin |
| GET    | `/homes` | all |
| POST   | `/homes` | admin, manager, engineer |
| GET    | `/homes/:id` | all |
| PATCH  | `/homes/:id` | admin, manager, engineer |
| DELETE | `/homes/:id` | admin |
| GET    | `/homes/:id/devices` | all |
| POST   | `/homes/:id/devices` | admin, engineer |
| PATCH  | `/devices/:id` | admin, engineer |
| DELETE | `/devices/:id` | admin |
| GET    | `/devices/:id/telemetry?from=&to=` | all |

---

## 5. 프로젝트 / 태스크 / AS

| Method | Path | Role |
|---|---|---|
| GET    | `/projects` | all |
| POST   | `/projects` | admin, manager |
| GET    | `/projects/:id` | all |
| PATCH  | `/projects/:id` | admin, manager |
| DELETE | `/projects/:id` | admin, manager |
| GET    | `/projects/:id/tasks` | all |
| POST   | `/projects/:id/tasks` | admin, manager, engineer |
| PATCH  | `/tasks/:id` | admin, manager, engineer |
| DELETE | `/tasks/:id` | admin, manager |
| GET    | `/as-tickets` | all |
| POST   | `/as-tickets` | admin, manager, engineer |
| PATCH  | `/as-tickets/:id` | admin, manager, engineer |

---

## 6. 견적 / 품목

| Method | Path | Role |
|---|---|---|
| GET    | `/products` | all |
| POST   | `/products` | admin, manager |
| PATCH  | `/products/:id` | admin, manager |
| DELETE | `/products/:id` | admin |
| GET    | `/quotes` | admin, manager, viewer |
| POST   | `/quotes` | admin, manager |
| GET    | `/quotes/:id` | admin, manager, viewer |
| PATCH  | `/quotes/:id` | admin, manager |
| DELETE | `/quotes/:id` | admin |
| POST   | `/quotes/:id/send` | admin, manager |
| POST   | `/quotes/:id/approve` | admin, manager |
| POST   | `/quotes/:id/reject` | admin, manager |
| POST   | `/quotes/:id/convert-order` | admin, manager |
| GET    | `/quotes/:id/pdf` | admin, manager, viewer |

### 견적 생성 — 서버측 재계산 강제
클라이언트가 보내는 `lineTotal`/`total` 값은 무시하고, 서버가 `product.unitPrice`, 할인율, VAT 를 기반으로 재계산 후 저장. 악의적 금액 조작을 차단한다.

```http
POST /v1/quotes
{
  "customerId": "c-uuid",
  "homeId": "h-uuid",
  "templateId": "tpl-standard",
  "validUntil": "2026-05-08T00:00:00Z",
  "items": [
    { "productId": "p-uuid", "qty": 10, "unitPrice": 50000, "discount": 5 },
    { "name": "설치비", "qty": 1, "unitPrice": 200000, "discount": 0 }
  ],
  "attrs": { "paymentTerms": "세금계산서 발행 후 30일" }
}
```
```json
// 201 — 서버 재계산 결과
{
  "id": "q-uuid", "code": "QT-2026-0001",
  "status": "draft",
  "subtotal": 675000, "discountTotal": 25000,
  "vatRate": 10, "vatAmount": 65000, "total": 715000,
  "items": [...]
}
```

---

## 7. 유지보수 / 결재 / 알림 / 감사

| Method | Path | Role |
|---|---|---|
| GET    | `/maintenance-jobs` | admin, manager, engineer |
| POST   | `/maintenance-jobs` | admin, manager |
| PATCH  | `/maintenance-jobs/:id` | admin, manager, engineer |
| GET    | `/approvals` | all (본인 관련) |
| POST   | `/approvals` | admin, manager, engineer |
| POST   | `/approvals/:id/approve` | 결재선 사용자 |
| POST   | `/approvals/:id/reject` | 결재선 사용자 |
| GET    | `/notifications` | all (본인) |
| PATCH  | `/notifications/:id/read` | all (본인) |
| GET    | `/audit-logs` | admin |

---

## 8. 분석 / 통계

| Method | Path | Role |
|---|---|---|
| GET | `/stats/overview` | all |
| GET | `/stats/devices?groupBy=category` | all |
| GET | `/stats/quotes?from=&to=` | admin, manager |
| GET | `/stats/period?year=2026` | all |

응답은 차트 친화적(`{ labels: [...], series: [{ name, data }] }`).

---

## 9. 레이트 리밋 / 관측성

- 모든 응답에 `X-RateLimit-*` 헤더
- 모든 요청에 `X-Request-Id` (클라이언트가 보낼 수 있고, 없으면 서버 생성)
- `GET /health` — public liveness (DB/Redis ping)
- `GET /ready` — public readiness (마이그레이션/시드 완료 여부)
- `/metrics` — Prometheus (내부 네트워크만)

---

**끝.** 실제 컨트롤러는 `apps/api/src/modules/*` 에 구현, DTO·스키마는 `packages/shared/src/schemas/*` 에서 가져온다.
