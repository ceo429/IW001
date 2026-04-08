import { AgentDefinition } from '../types';

/**
 * Backend agent: owns the Express/TS API server.
 * Depends on `data` so migrations and schema exist before routes/services.
 */
export const backendAgent: AgentDefinition = {
  role: 'backend',
  label: 'Backend (TS/Express)',
  defaultModel: 'sonnet',
  dependsOn: ['data'],
  scope: {
    allowedPaths: [
      'backend/src/**',
      'backend/lib/**',
      'backend/package.json',
      'backend/tsconfig.json',
      'api-spec.yaml',
    ],
    forbiddenPaths: [
      'frontend/**',
      'infra/**',
      'backend/prisma/migrations/**',
      'backend/prisma/schema.prisma',
    ],
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  },
  systemPrompt: [
    'You are the BACKEND agent for the IW001 IoT maintenance dashboard.',
    'You own the Express + TypeScript API server.',
    '',
    'ALLOWED paths (you may read and write):',
    '  - backend/src/**',
    '  - backend/lib/**',
    '  - backend/package.json, backend/tsconfig.json',
    '  - api-spec.yaml (read primarily; update only when adding endpoints)',
    '',
    'FORBIDDEN paths (never touch):',
    '  - frontend/**',
    '  - infra/**',
    '  - backend/prisma/schema.prisma (owned by data agent)',
    '  - backend/prisma/migrations/** (owned by data agent)',
    '',
    'Rules:',
    '  1. TypeScript strict mode. No `any` except at well-marked boundaries.',
    '  2. Express routes in backend/src/routes/, services in services/,',
    '     shared lib code in backend/lib/.',
    '  3. Access the database through Prisma Client only. Do not write raw',
    '     SQL migrations - that is the data agent.',
    '  4. Keep api-spec.yaml in sync when endpoints change.',
    '  5. If the schema needs changes, STOP and report "needs data: ..."',
  ].join('\n'),
  tasks: {
    migrate: {
      alias: 'migrate',
      description: 'Apply Prisma client generation and seed-aware startup.',
      prompt: [
        'Ensure backend/src/lib/prisma.ts exports a singleton PrismaClient.',
        'Add a bootstrap step in backend/src/app.ts that runs `prisma generate`',
        'equivalent at startup (via @prisma/client import) and logs connection',
        'status. Do NOT write schema files.',
      ].join(' '),
      estimatedBudgetUsd: 2,
    },
    routes: {
      alias: 'routes',
      description: 'Implement REST routes from api-spec.yaml.',
      prompt: [
        'Read api-spec.yaml and implement all declared routes under',
        'backend/src/routes/. Group by resource: devices, alerts, maintenance,',
        'telemetry. Each route file exports an Express Router. Register them',
        'in backend/src/app.ts.',
      ].join(' '),
      estimatedBudgetUsd: 5,
      model: 'opus',
    },
    services: {
      alias: 'services',
      description: 'Implement domain services + validation.',
      prompt: [
        'Under backend/src/services/, implement DeviceService, AlertService,',
        'MaintenanceService. Each service owns its Prisma queries and exposes',
        'pure async methods. Add zod validators under backend/src/schemas/.',
      ].join(' '),
      estimatedBudgetUsd: 5,
      model: 'opus',
    },
    websocket: {
      alias: 'websocket',
      description: 'Add a /ws endpoint for live telemetry.',
      prompt: [
        'Add a WebSocket server under backend/src/ws/ using the `ws` package.',
        'Broadcast telemetry events published to a Redis pub/sub channel',
        '`telemetry.*`. Document the wire format in backend/src/ws/README.md.',
      ].join(' '),
      estimatedBudgetUsd: 4,
    },
  },
};
