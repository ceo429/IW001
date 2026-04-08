import { AgentDefinition } from '../types';

/**
 * Data agent: owns Prisma schema, migrations, seeds, and raw SQL.
 * Has no dependencies - runs first in phase1 alongside infra.
 */
export const dataAgent: AgentDefinition = {
  role: 'data',
  label: 'Data (Prisma/SQL)',
  defaultModel: 'sonnet',
  dependsOn: [],
  scope: {
    allowedPaths: [
      'backend/prisma/**',
      '**/*.sql',
      'backend/src/seed/**',
      'data/**',
    ],
    forbiddenPaths: [
      'frontend/**',
      'infra/**',
      'backend/src/routes/**',
      'backend/src/services/**',
    ],
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  },
  systemPrompt: [
    'You are the DATA agent for the IW001 IoT maintenance dashboard.',
    'You own the Prisma schema, migrations, seed scripts, and raw SQL.',
    '',
    'ALLOWED paths (you may read and write):',
    '  - backend/prisma/**  (schema.prisma, migrations/, seed.ts)',
    '  - **/*.sql',
    '  - backend/src/seed/**',
    '  - data/**            (fixture CSV/JSON files)',
    '',
    'FORBIDDEN paths (never touch):',
    '  - frontend/**',
    '  - infra/**',
    '  - backend/src/routes/**, backend/src/services/**',
    '',
    'Rules:',
    '  1. Prisma-first. Define models in schema.prisma, run `prisma migrate',
    '     dev` to produce migration files. Never hand-edit migrations once',
    '     committed.',
    '  2. Seeds must be idempotent - safe to run twice.',
    '  3. Document every index decision inline in schema.prisma.',
    '  4. If route/service code needs regeneration after a schema change,',
    '     STOP and report "needs backend: regen client".',
  ].join('\n'),
  tasks: {
    seed: {
      alias: 'seed',
      description: 'Seed 200 demo devices + telemetry window.',
      prompt: [
        'Write backend/prisma/seed.ts that seeds 200 devices across 5 sites,',
        'with 30 days of 5-minute telemetry samples and ~50 alerts. The seed',
        'must be idempotent (upsert by externalId). Register the seed in',
        'backend/package.json under `prisma.seed`.',
      ].join(' '),
      estimatedBudgetUsd: 4,
    },
    migrate: {
      alias: 'migrate',
      description: 'Author initial Prisma schema + migration.',
      prompt: [
        'Create backend/prisma/schema.prisma with models: Site, Device,',
        'TelemetrySample, Alert, MaintenanceTicket, User. Add useful indexes',
        '(device.siteId, telemetry.(deviceId, capturedAt), alert.status).',
        'Generate the initial migration under backend/prisma/migrations/.',
      ].join(' '),
      estimatedBudgetUsd: 4,
    },
    sync: {
      alias: 'sync',
      description: 'Reconcile schema.prisma with any drifted migrations.',
      prompt: [
        'Compare backend/prisma/schema.prisma with the applied migrations and',
        'produce a single `prisma migrate dev --create-only` migration that',
        'reconciles any drift. Never drop columns without explicit approval in',
        'the prompt.',
      ].join(' '),
      estimatedBudgetUsd: 3,
    },
    optimize: {
      alias: 'optimize',
      description: 'Analyze slow queries + propose indexes.',
      prompt: [
        'Read backend/src/services/** (read-only) and identify the hottest',
        'Prisma queries. Propose (and add, with commentary) indexes in',
        'schema.prisma. Emit a short report as backend/prisma/OPTIMIZE.md.',
      ].join(' '),
      estimatedBudgetUsd: 3,
    },
  },
};
