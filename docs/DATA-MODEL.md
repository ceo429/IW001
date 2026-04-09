# IOTWORKS DESK — Data Model

> Prisma 스키마 기반 데이터 모델 설명. 원본(`demo/index.html`)의 하드코딩된 `const`
> 배열(`ACCOUNTS`, `HOMES`, `ALL_DEVICES`, `PROJECTS_DATA`, `QUOTES_DATA`,
> `PRODUCTS_CATALOG`)을 정규화된 관계형 스키마로 옮긴다.
>
> **원본 참조**: 기획서 5장(데이터 모델), 기획서 3장(19페이지 정보 아키텍처).

---

## 1. ERD 개요 (ASCII)

```
                  ┌───────────┐
                  │   User    │────┐
                  └─────┬─────┘    │
                        │ 1..*     │ auditor
                        ▼          ▼
┌──────────┐    ┌───────────┐   ┌──────────┐
│ Customer │◄──►│  Account  │   │ AuditLog │
└────┬─────┘ 1..*└──┬────┬──┘   └──────────┘
     │              │    │
     │ 1..*         │ 1..*
     ▼              ▼
┌──────────┐   ┌──────────┐
│  Quote   │   │   Home   │─────┐
└────┬─────┘   └──┬───────┘     │
     │            │ 1..*        │ 1..*
     │ 1..*       ▼             ▼
     │       ┌──────────┐ ┌──────────────┐
     ▼       │  Device  │ │MaintenanceJob│
┌──────────┐ └────┬─────┘ └──────────────┘
│QuoteItem │      │ 1..*
└────┬─────┘      ▼
     │ *..1  ┌──────────────┐
     ▼       │Telemetry     │
┌──────────┐ │Sample        │
│ Product  │ └──────────────┘
└──────────┘

┌──────────┐   ┌──────────┐    ┌──────────────┐
│ Project  │──►│   Task   │    │   AsTicket   │
└──────────┘ 1..* └──────┘    └──────────────┘

┌──────────────┐   ┌─────────────────┐
│ Notification │   │ ApprovalRequest │
└──────────────┘   └─────────────────┘

┌──────────────────────────────────┐
│ Permission(role, pageId, ...)    │
└──────────────────────────────────┘
```

---

## 2. 모델 목록 (17개)

| 모델 | 설명 | 기획서 참조 |
|---|---|---|
| `User` | 로그인 가능한 사람. 역할/권한 보유. | 1.3, 5.1 (ACCOUNTS 확장 필드) |
| `Session` | Refresh 토큰 세션 추적. | — (새 요구) |
| `Customer` | 고객사. | 4.5 |
| `Account` | 헤이홈 API 계정(토큰·연동 장소 묶음). | 4.1.2 |
| `Home` | IoT 장소(매장/오피스/공장). | 4.1.3 |
| `Device` | IoT 디바이스(스위치·센서·허브 등). | 4.1.3 |
| `TelemetrySample` | 디바이스 원격 측정값 시계열. | 4.2.1 (공간 매핑 보조) |
| `Project` | 프로젝트. | 4.2.2 |
| `Task` | 태스크(칸반/캘린더). | 4.2.2 |
| `AsTicket` | AS 인입건. | 4.2.3 |
| `Quote` | 견적서. | 4.3.1 |
| `QuoteItem` | 견적 라인 아이템. | 4.3.1 |
| `Product` | 품목 카탈로그. | 4.3.2 |
| `MaintenanceJob` | 정기 점검 일정. | 4.6.2 |
| `ApprovalRequest` | 전자결재. | 4.6.1 |
| `Notification` | 알림 이력. | 4.7.1 |
| `AuditLog` | 감사 로그. | 4.7.2, docs/SECURITY.md §8 |
| `Permission` | 역할×페이지 권한 매트릭스. | 5.2 |

> 17개가 맞고, ERD에 모두 포함되진 않았다(생략 단순화).

---

## 3. 핵심 모델 — Prisma 스키마 발췌

> 실제 전체 스키마는 `apps/api/prisma/schema.prisma` 에 위치.
> 아래는 설계 의도를 보여주는 요약.

```prisma
// ─── 사용자 / 인증 ───────────────────────────────────────────
enum Role {
  admin
  manager
  engineer
  viewer
}

enum UserStatus {
  active
  inactive
  locked
}

model User {
  id              String     @id @default(uuid())
  email           String     @unique
  passwordHash    String
  name            String
  phone           String?
  department      String?
  role            Role       @default(viewer)
  status          UserStatus @default(active)
  mustChangePw    Boolean    @default(true)
  lastLoginAt     DateTime?
  failedLoginCnt  Int        @default(0)
  lockedUntil     DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  sessions        Session[]
  auditLogs       AuditLog[]
  createdQuotes   Quote[]    @relation("QuoteCreatedBy")
  assignedTasks   Task[]     @relation("TaskAssignedTo")

  @@index([role, status])
}

model Session {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshJti    String   @unique
  ip            String
  userAgent     String
  createdAt     DateTime @default(now())
  expiresAt     DateTime
  revokedAt     DateTime?

  @@index([userId])
  @@index([expiresAt])
}

// ─── 권한 ─────────────────────────────────────────────────
model Permission {
  role       Role
  pageId     String   // 'dashboard' | 'quotes' | 'admin' | ...
  canRead    Boolean  @default(false)
  canWrite   Boolean  @default(false)
  canDelete  Boolean  @default(false)
  updatedAt  DateTime @updatedAt

  @@id([role, pageId])
}

// ─── 고객 / 장소 / 기기 ───────────────────────────────────
model Customer {
  id         String    @id @default(uuid())
  name       String
  ceoName    String?
  bizNo      String?   @unique
  phone      String?
  email      String?
  address    String?
  discountRate Decimal  @default(0) @db.Decimal(5, 2)
  note       String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  accounts   Account[]
  homes      Home[]
  quotes     Quote[]
}

model Account {
  id            String    @id @default(uuid())
  email         String    @unique
  period        String    // '26' = 2026년 계약
  tokenStatus   String    @default("valid") // valid | expired
  tokenExpiresAt DateTime?
  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id])
  createdAt     DateTime  @default(now())

  homes         Home[]
}

model Home {
  id              String    @id @default(uuid())
  name            String
  address         String?
  floorPlanSvg    String?   @db.Text
  customerId      String
  customer        Customer  @relation(fields: [customerId], references: [id])
  accountId       String?
  account         Account?  @relation(fields: [accountId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  devices         Device[]
  maintenanceJobs MaintenanceJob[]
  asTickets       AsTicket[]
  quotes          Quote[]

  @@index([customerId])
  @@index([accountId])
}

enum DeviceCategory {
  switch
  hub
  plug
  sensor
  dc
  media
  etc
}

model Device {
  id           String         @id @default(uuid())
  externalId   String         // 헤이홈 device id
  name         String
  category     DeviceCategory
  model        String?
  online       Boolean        @default(false)
  battery      Int?           // 0-100
  lastSeenAt   DateTime?
  posX         Float?         // 공간 매핑 좌표
  posY         Float?
  homeId       String
  home         Home           @relation(fields: [homeId], references: [id], onDelete: Cascade)
  createdAt    DateTime       @default(now())

  telemetry    TelemetrySample[]

  @@unique([homeId, externalId])
  @@index([online])
}

model TelemetrySample {
  id         BigInt   @id @default(autoincrement())
  deviceId   String
  device     Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  capturedAt DateTime
  payload    Json

  @@index([deviceId, capturedAt])
}

// ─── 프로젝트 / 태스크 / AS ───────────────────────────────
enum ProjectStatus { todo doing done archived }
enum Priority     { low normal high urgent }

model Project {
  id         String        @id @default(uuid())
  title      String
  status     ProjectStatus @default(todo)
  priority   Priority      @default(normal)
  startAt    DateTime?
  dueAt      DateTime?
  customerId String?
  customer   Customer?     @relation(fields: [customerId], references: [id])
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  tasks      Task[]
}

model Task {
  id           String        @id @default(uuid())
  projectId    String
  project      Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title        String
  status       ProjectStatus @default(todo)
  priority     Priority      @default(normal)
  assigneeId   String?
  assignee     User?         @relation("TaskAssignedTo", fields: [assigneeId], references: [id])
  dueAt        DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([projectId, status])
  @@index([assigneeId, dueAt])
}

enum AsStatus { open in_progress resolved closed }

model AsTicket {
  id          String   @id @default(uuid())
  homeId      String?
  home        Home?    @relation(fields: [homeId], references: [id])
  symptom     String
  rootCause   String?
  action      String?
  status      AsStatus @default(open)
  openedAt    DateTime @default(now())
  closedAt    DateTime?
  assigneeId  String?

  @@index([status, openedAt])
}

// ─── 견적 / 품목 ────────────────────────────────────────
enum QuoteStatus { draft sent approved rejected ordered cancelled }

model Product {
  id         String   @id @default(uuid())
  category   String   // 'switch' | 'hub' | ...
  name       String
  model      String?
  unit       String   @default("EA")
  unitPrice  Decimal  @db.Decimal(12, 2)
  stock      Int      @default(0)
  minStock   Int      @default(0)
  supplier   String?
  description String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  quoteItems QuoteItem[]

  @@index([category])
}

model Quote {
  id            String      @id @default(uuid())
  code          String      @unique // QT-2026-0001
  customerId    String
  customer      Customer    @relation(fields: [customerId], references: [id])
  homeId        String?
  home          Home?       @relation(fields: [homeId], references: [id])
  status        QuoteStatus @default(draft)
  templateId    String      @default("tpl-standard")
  issuedAt      DateTime    @default(now())
  validUntil    DateTime
  subtotal      Decimal     @db.Decimal(14, 2) @default(0)
  discountTotal Decimal     @db.Decimal(14, 2) @default(0)
  vatRate       Decimal     @db.Decimal(5, 2)  @default(10)
  vatAmount     Decimal     @db.Decimal(14, 2) @default(0)
  total         Decimal     @db.Decimal(14, 2) @default(0)
  note          String?
  attrs         Json?       // 공급자·수신자·납품·결제 조건
  createdById   String
  createdBy     User        @relation("QuoteCreatedBy", fields: [createdById], references: [id])
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  items         QuoteItem[]

  @@index([customerId, status])
  @@index([issuedAt])
}

model QuoteItem {
  id         String  @id @default(uuid())
  quoteId    String
  quote      Quote   @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  productId  String?
  product    Product? @relation(fields: [productId], references: [id])
  name       String  // 제품 미등록 시 프리 텍스트 허용
  model      String?
  unit       String  @default("EA")
  qty        Int
  unitPrice  Decimal @db.Decimal(12, 2)
  discount   Decimal @db.Decimal(5, 2) @default(0) // %
  lineTotal  Decimal @db.Decimal(14, 2)
  sortOrder  Int     @default(0)

  @@index([quoteId, sortOrder])
}

// ─── 결재 / 유지보수 / 알림 / 감사 ─────────────────────
enum ApprovalStatus { pending approved rejected cancelled }

model ApprovalRequest {
  id          String         @id @default(uuid())
  title       String
  body        String         @db.Text
  status      ApprovalStatus @default(pending)
  requesterId String
  approverIds String[]       // Postgres text array
  createdAt   DateTime       @default(now())
  decidedAt   DateTime?
}

model MaintenanceJob {
  id         String   @id @default(uuid())
  homeId     String
  home       Home     @relation(fields: [homeId], references: [id])
  scheduledAt DateTime
  checklist  Json
  done       Boolean  @default(false)
  doneAt     DateTime?
  engineerId String?

  @@index([scheduledAt])
}

enum NotifSeverity { info warning error critical }

model Notification {
  id        String        @id @default(uuid())
  userId    String?
  title     String
  body      String
  severity  NotifSeverity @default(info)
  read      Boolean       @default(false)
  createdAt DateTime      @default(now())

  @@index([userId, read, createdAt])
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id])
  ip         String
  userAgent  String
  method     String
  path       String
  resource   String
  resourceId String?
  action     String
  severity   String   @default("normal")
  before     Json?
  after      Json?
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
  @@index([resource, resourceId])
}
```

---

## 4. 인덱스 / 성능

- **시계열**: `TelemetrySample` 은 파티셔닝 후보. 초기에는 `(deviceId, capturedAt)` 복합 인덱스로 시작, 데이터 증가 시 시간 기준 파티션(Phase 2).
- **검색**: 고객·제품·견적의 `name` 컬럼은 Phase 2 에서 `pg_trgm` GIN 인덱스 도입 가능.
- **외래키 정책**:
  - `Device.homeId` → `onDelete: Cascade` (장소 삭제 시 기기도 삭제, 감사 로그에 반영)
  - `Quote.customerId` → `onDelete: Restrict` (견적이 살아있는 고객은 삭제 불가)

---

## 5. 마이그레이션 전략 (기존 데모 → DB)

1. `apps/api/prisma/seed.ts` 가 `demo/` 내부의 하드코딩 배열(참고용)을 보고 초기 시드 작성
2. **멱등(idempotent)**: `upsert` 사용, 고객사 `bizNo`·계정 `email`·기기 `externalId` 유니크 키 기준
3. 사용자는 **관리자 1인만** 시드하고 나머지는 빈 DB — 관리자 초기 비번은 환경변수에서 로드, 최초 로그인 시 강제 변경
4. 권한 매트릭스 기본값 삽입 (19페이지 × 4역할)
5. 마이그레이션 CI 검증: `prisma migrate diff --exit-code` 로 드리프트 감지

---

## 6. 트랜잭션 경계

| 작업 | 트랜잭션 범위 |
|---|---|
| 견적 생성 | `Quote` + `QuoteItem[]` + `AuditLog` 한 트랜잭션 |
| 견적 수주 전환 | `Quote.status=ordered` + 재고 차감 + `Project`/`Task` 생성 + `AuditLog` 한 트랜잭션 |
| 권한 변경 | `Permission` 갱신 + `AuditLog`(severity=high) 한 트랜잭션 |
| 로그인 | `User.failedLoginCnt` 초기화 + `Session` 생성 + `AuditLog` 한 트랜잭션 |

Prisma `$transaction([...])` 또는 interactive `$transaction(async tx => ...)` 사용.

---

## 7. 데이터 보존 / 개인정보

- **삭제 요청 대응**: `User.status = 'inactive'` + 식별자 익명화(`email = 'deleted+<uuid>@...'`)
  견적·감사 로그는 보존(법적/회계 요구).
- **감사 로그 보존**: 최소 1년, 민감 변경(권한·계정)은 3년.
- **백업**: 매일 논리 백업 + 주간 PITR 검증. 백업 암호화 필수.

---

**끝.** 전체 스키마는 `apps/api/prisma/schema.prisma` 에서 계속 진화한다.
