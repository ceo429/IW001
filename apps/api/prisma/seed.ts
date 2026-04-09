/**
 * Idempotent initial seed for IOTWORKS DESK.
 *
 * - Creates the single admin account from env (SEED_ADMIN_*)
 *   with `mustChangePw = true`.
 * - Installs the default permission matrix (19 pages × 4 roles) from
 *   @iw001/shared/constants.
 *
 * Safe to run multiple times. Re-running does not duplicate rows because
 * we key on email (User) and (role, pageId) (Permission).
 */

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { buildDefaultPermissionMatrix } from '@iw001/shared';

const prisma = new PrismaClient();

const ARGON2_OPTS = {
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} as const;

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const name = process.env.SEED_ADMIN_NAME ?? '최고관리자';
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set before seeding.',
    );
  }

  const passwordHash = await hash(password, ARGON2_OPTS);

  const user = await prisma.user.upsert({
    where: { email },
    // Do not overwrite an existing admin's password or mustChangePw on re-run.
    update: { name, role: Role.admin, status: UserStatus.active },
    create: {
      email,
      name,
      passwordHash,
      role: Role.admin,
      status: UserStatus.active,
      mustChangePw: true,
    },
  });

  console.log(`[seed] admin ready: ${user.email} (id=${user.id})`);
}

async function seedPermissions() {
  const entries = buildDefaultPermissionMatrix();
  let created = 0;
  let skipped = 0;

  for (const e of entries) {
    const existing = await prisma.permission.findUnique({
      where: { role_pageId: { role: e.role as Role, pageId: e.pageId } },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.permission.create({
      data: {
        role: e.role as Role,
        pageId: e.pageId,
        canRead: e.canRead,
        canWrite: e.canWrite,
        canDelete: e.canDelete,
      },
    });
    created++;
  }

  console.log(
    `[seed] permissions: ${created} created, ${skipped} already present (total ${entries.length})`,
  );
}

async function main() {
  await seedAdmin();
  await seedPermissions();
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
