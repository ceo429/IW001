# IOTWORKS DESK — Roadmap

> Phase 0 (단일 HTML 데모) → Phase 5 (모바일/AI) 까지의 마이그레이션 로드맵.
> 기획서 10장 "일정" 을 기반으로 재설계 관점에서 재정리.

---

## Phase 0 — Demo (완료, 보존)
**위치**: `demo/`
**내용**: 단일 HTML 파일 데모. 19페이지 정보 아키텍처·UX·브랜드 감각 검증용 참고 구현.
**상태**: 새 구조 마이그레이션의 **참고 자료**. 신규 기능 추가는 더 이상 여기에 하지 않음.

---

## Phase 1 — Foundation (진행)
**목표**: 모던 풀스택 기반 마련 + 재설계된 4가지 문제 해결.

### 1.1 모노레포 뼈대
- [x] pnpm workspaces + Turborepo
- [x] `apps/web`, `apps/api`, `packages/shared`, `infra/`, `docs/`
- [x] `.env.example`, 공통 `.gitignore`, ESLint/Prettier 규칙

### 1.2 데이터베이스 / API 코어
- [ ] Prisma 스키마 — 17 모델 (User, Session, Customer, Account, Home, Device, TelemetrySample, Project, Task, AsTicket, Quote, QuoteItem, Product, MaintenanceJob, ApprovalRequest, Notification, AuditLog, Permission)
- [ ] 초기 마이그레이션
- [ ] 시드 스크립트 (관리자 1인 + 권한 매트릭스 기본값)

### 1.3 인증 / 인가
- [ ] JWT Access/Refresh + Refresh Token Rotation
- [ ] Argon2id 해싱
- [ ] `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`
- [ ] 계정 잠금 (5회 실패 → 15분)
- [ ] `AuditInterceptor` (모든 쓰기 API 자동 기록)

### 1.4 프론트 코어
- [ ] React + TS + Vite + Tailwind 스캐폴드
- [ ] React Router 로 7그룹/19페이지 라우트 등록
- [ ] 로그인 화면 + `AuthContext` + 토큰 메모리 보관
- [ ] 사이드바 + 다크/라이트 테마 (Zustand + localStorage)
- [ ] TanStack Query + axios 인스턴스 (자동 401 → refresh)

### 1.5 첫 E2E 기능
- [ ] 로그인 / 로그아웃 / 비밀번호 변경
- [ ] 사용자 CRUD (관리자)
- [ ] 권한 매트릭스 편집
- [ ] 대시보드 (KPI 카드 + 차트)

**완료 기준**: 운영 관리자가 계정을 만들고 다른 사용자가 로그인해 대시보드를 볼 수 있다. 모든 API가 Guard 체인을 통과하며, 권한 우회가 불가능하다.

---

## Phase 2 — Core Business (6주)
**목표**: 19페이지 중 핵심 11개를 실제 DB 연결 상태로 이행.

### 2.1 모니터링 (3페이지)
- [ ] 대시보드 — 실 데이터 KPI, 최근 알림
- [ ] 계정관리 — 헤이홈 계정 CRUD, 토큰 상태
- [ ] 장소별 현황 — 카드 그리드, 온라인율, 상세 드릴다운

### 2.2 운영 (4페이지)
- [ ] 공간매핑 — SVG 평면도 + 기기 좌표 편집 (기기 `posX/posY` 필드)
- [ ] 프로젝트&태스크 — 칸반/카드/캘린더 3뷰
- [ ] 공지사항 — 사내 공지 CRUD
- [ ] AS 인입건 — 티켓 라이프사이클

### 2.3 재무 (2페이지)
- [ ] 견적서 — 4종 템플릿, 라인 편집, **서버측 재계산**, PDF 출력
- [ ] 품목관리 — 15종 카탈로그, 재고 부족 경고

### 2.4 고객 (1페이지)
- [ ] 고객관리 — 고객사 카드 그리드

### 2.5 시스템 (1페이지)
- [ ] 감사 로그 — 관리자용 검색/필터/CSV 내보내기

**완료 기준**: 관리자가 실제 운영 시나리오(견적 작성 → 발송 → 승인 → 수주 전환 → 프로젝트 자동 생성 → 태스크 할당)를 DB 기반으로 수행할 수 있다.

---

## Phase 3 — Completeness + Pilot (4주)
**목표**: 남은 8페이지 + 파일럿 배포.

### 3.1 남은 페이지
- [ ] 통계 / 기간별 통계 / OKR
- [ ] 결재 / 유지보수 / AS 가이드
- [ ] 알림 관리 / 관리자 설정 (API 연결 / 섹션 권한 / 계정 관리)

### 3.2 인프라
- [ ] Docker 이미지 + Docker Compose (postgres, redis, api, web)
- [ ] CI (GitHub Actions): lint + type + test + build + `prisma migrate diff`
- [ ] 스테이징 배포 (단일 EC2 or ECS Fargate)

### 3.3 파일럿
- [ ] 내부 사용자 5명 초대, 피드백 수집
- [ ] 버그 수정 + UX 개선

---

## Phase 4 — Launch (2주)
- [ ] 성능 튜닝: API p95 200ms 이하, 프론트 LCP 2.5s 이하
- [ ] 보안 체크리스트 최종 통과 (`docs/SECURITY.md` §11)
- [ ] 관측성: Pino 로그 → Loki, Prometheus → Grafana 대시보드
- [ ] 백업/복구 리허설
- [ ] 프로덕션 배포
- [ ] 릴리스 노트

---

## Phase 5 — Mobile / AI / Realtime (6주)
- [ ] PWA 설정 + iOS/Android 홈화면 설치
- [ ] 리얼타임 — WebSocket 기반 기기 온라인 상태 푸시
- [ ] AI — AS 인입건 자동 분류 모델 (Phase 2 `AsTicket` 데이터 축적 후)
- [ ] MFA (TOTP)
- [ ] i18n — 영어

---

## 의존 관계 / 크리티컬 패스

```
 Phase 1.1 ─┬─ Phase 1.2 ─┬─ Phase 1.3 ─┬─ Phase 1.4 ─── Phase 1.5 ── Phase 2 ── Phase 3 ── Phase 4 ── Phase 5
            │              │              │
            │              │              └─ AuditInterceptor 는 Phase 2 모든 쓰기에 필수
            │              └─ 마이그레이션 완료 전엔 시드·테스트 불가
            └─ 모노레포 구조 확정 전엔 교차 패키지 import 불가
```

---

## 하네스(`harness/`) 재매핑

새 구조에 맞춰 `harness/agents/*.agent.ts` 의 `allowedPaths` 를 갱신한다:

| 에이전트 | 기존 | 신규 |
|---|---|---|
| `frontend` | `frontend/**`, `iot_dashboard_app.jsx`, `*.jsx` | `apps/web/**`, `packages/shared/**` (읽기만) |
| `backend`  | `backend/src/**`, `backend/lib/**` | `apps/api/src/**`, `packages/shared/**` (읽기만) |
| `data`     | `backend/prisma/**` | `apps/api/prisma/**` |
| `infra`    | `infra/**`, `Dockerfile*` | `infra/**`, `Dockerfile*`, `.github/**` |
| `qa`       | `**/tests/**`, `e2e/**` | `apps/*/tests/**`, `e2e/**`, `docs/**` |

업데이트는 Phase 1.1 끝에서 1회 수행.

---

## 위험 / 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| 하네스 업데이트 지연 | 에이전트가 허용 외 경로에 쓰기 | Phase 1.1 에서 즉시 재매핑 |
| 견적 계산 로직 이중화 | 서버-클라이언트 불일치 | 서버 재계산만 권위, 프론트는 미리보기만 |
| 권한 매트릭스 버그 | 권한 우회 | 통합 테스트에서 역할×엔드포인트 매트릭스 커버 |
| 마이그레이션 드리프트 | 프로덕션 반영 실패 | CI `prisma migrate diff --exit-code` |
| 시드 비멱등 | 재실행 시 중복 | `upsert` 강제 + 유니크 키 설계 |

---

**끝.**
