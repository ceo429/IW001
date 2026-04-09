# IOTWORKS DESK

> IoT 통합 유지보수·운영 대시보드 (IW001)
>
> **v2 아키텍처** — 모던 풀스택 모노레포. React + NestJS + PostgreSQL + Prisma.

---

## 동기

기존 단일 HTML 데모(`demo/`)의 4가지 구조적 문제를 근본적으로 해결한다:

1. **유지보수성** — React 컴포넌트화 + Tailwind + TypeScript + feature-based 폴더
2. **XSS 보안** — JSX 자동 이스케이프 + DOMPurify + zod 서버 검증 + Helmet + CSP
3. **데이터 휘발성** — PostgreSQL + Prisma + REST API + TanStack Query + Zustand
4. **하드코딩 인증** — JWT(Access/Refresh) + Argon2id + NestJS Guard 기반 RBAC + 감사 로그

상세는 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), 보안 통제는 [`docs/SECURITY.md`](./docs/SECURITY.md),
데이터 모델은 [`docs/DATA-MODEL.md`](./docs/DATA-MODEL.md), 로드맵은 [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## 구조

```
iw001/
├── apps/
│   ├── web/              # React + Vite + TS + Tailwind (프론트엔드)
│   └── api/              # NestJS + Prisma + JWT (백엔드)
├── packages/
│   └── shared/           # 공통 타입/zod 스키마/상수
├── infra/                # Docker Compose, Dockerfile
├── docs/                 # 설계 문서
├── demo/                 # Phase 0 단일 HTML 데모 (보존·참고)
├── harness/              # 에이전트 오케스트레이션 하네스
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 시작하기

### 요구사항
- Node.js ≥ 20
- pnpm ≥ 9
- Docker + Docker Compose (로컬 DB/Redis)

### 초기 셋업

```bash
# 1) 의존성 설치
pnpm install

# 2) 환경변수 준비
cp .env.example .env
# JWT_ACCESS_SECRET, JWT_REFRESH_SECRET 는 반드시 생성:
#   openssl rand -base64 48

# 3) 인프라 기동 (Postgres + Redis)
pnpm docker:up

# 4) DB 마이그레이션 + 시드 (관리자 계정 생성)
pnpm db:migrate
pnpm db:seed

# 5) 개발 서버 기동 (web + api 동시)
pnpm dev
```

- 프론트: http://localhost:5173
- API: http://localhost:3000/v1
- 초기 로그인: `.env` 의 `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (최초 로그인 시 비밀번호 강제 변경)

---

## 스크립트 (루트)

| 명령 | 동작 |
|---|---|
| `pnpm dev` | web + api 동시 실행 (Turbo) |
| `pnpm build` | 모든 패키지 빌드 |
| `pnpm test` | 모든 테스트 |
| `pnpm lint` | ESLint 전체 |
| `pnpm typecheck` | tsc noEmit 전체 |
| `pnpm db:migrate` | Prisma 마이그레이션 적용 |
| `pnpm db:seed` | 시드 실행 |
| `pnpm docker:up` / `pnpm docker:down` | 인프라 컨테이너 |

---

## 참고 자산

| 경로 | 상태 | 설명 |
|---|---|---|
| `demo/` | 보존 | Phase 0 단일 HTML 데모 — UX·정보 구조 참고용 |
| `harness/` | 유지 | 에이전트 오케스트레이션 하네스 (새 구조로 `allowedPaths` 재매핑 예정) |
| `harness/개발기획서.md` | 유지 | 원본 기획서 (v1) |

---

## 보안 원칙

- 클라이언트 권한 체크는 **UX 보조**. 모든 권한은 **서버측 Guard** 가 최종 결정.
- `dangerouslySetInnerHTML` 는 **금지** (ESLint 규칙 강제). 부득이할 때만 `DOMPurify.sanitize()`.
- JWT Access 토큰은 **메모리 전용** (localStorage 금지). Refresh 는 `httpOnly + Secure + SameSite=Strict` 쿠키.
- 모든 DTO 는 **zod 스키마** 통과 필수.

---

## 기여

- 브랜치: 기능 개발은 `feat/<topic>`, 버그는 `fix/<topic>`
- 커밋 메시지: 왜(why) 중심, 현재형
- PR 전 반드시 `pnpm lint && pnpm typecheck && pnpm test` 로컬 통과
- 보안 영향 있는 변경은 `docs/SECURITY.md` 체크리스트를 업데이트
