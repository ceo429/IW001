import { AgentDefinition } from '../types';

/**
 * QA agent: owns tests, e2e, and documentation.
 * Depends on backend + frontend so runs last in phase3.
 */
export const qaAgent: AgentDefinition = {
  role: 'qa',
  label: 'QA (Tests/Docs)',
  defaultModel: 'sonnet',
  dependsOn: ['backend', 'frontend'],
  scope: {
    allowedPaths: [
      '**/tests/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      'e2e/**',
      'docs/**',
      'README.md',
    ],
    forbiddenPaths: [
      'backend/src/routes/**',
      'backend/src/services/**',
      'frontend/src/components/**',
      'backend/prisma/schema.prisma',
      'infra/docker-compose.yml',
    ],
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  },
  systemPrompt: [
    'You are the QA agent for the IW001 IoT maintenance dashboard.',
    'You own tests, end-to-end scenarios, and documentation.',
    '',
    'ALLOWED paths (you may read and write):',
    '  - **/tests/**, **/__tests__/**',
    '  - **/*.test.ts, *.test.tsx, *.spec.ts',
    '  - e2e/**',
    '  - docs/**',
    '  - README.md',
    '',
    'FORBIDDEN paths (never touch):',
    '  - backend/src/routes/**, backend/src/services/**',
    '  - frontend/src/components/**',
    '  - backend/prisma/schema.prisma',
    '  - infra/docker-compose.yml',
    '',
    'Rules:',
    '  1. You may READ production source code freely to understand behavior,',
    '     but never modify it. If a test reveals a bug, STOP and report',
    '     "needs backend: ..." or "needs frontend: ..." - do not fix it.',
    '  2. Use Vitest for unit tests, Playwright for e2e.',
    '  3. Every new route the backend adds must have a matching request',
    '     test. Every new component the frontend adds must have a smoke test.',
    '  4. Documentation lives in docs/ and is written in Markdown.',
  ].join('\n'),
  tasks: {
    test: {
      alias: 'test',
      description: 'Run the full test matrix and report failures.',
      prompt: [
        'Run `npm test` in backend/ and frontend/ (whichever exist). Report',
        'PASS/FAIL counts and the first 3 failing tests in detail. Do NOT',
        'edit production code to fix failures - just report them.',
      ].join(' '),
      estimatedBudgetUsd: 2,
    },
    'api-test': {
      alias: 'api-test',
      description: 'Generate backend route tests from api-spec.yaml.',
      prompt: [
        'For every route declared in api-spec.yaml, write a supertest-based',
        'request test under backend/tests/routes/. Cover happy path +',
        '1 validation error case per endpoint.',
      ].join(' '),
      estimatedBudgetUsd: 4,
    },
    e2e: {
      alias: 'e2e',
      description: 'Playwright flow: login -> device detail -> alert ack.',
      prompt: [
        'Under e2e/, scaffold Playwright and write a single spec covering:',
        'login, navigate to a device, view telemetry chart, acknowledge an',
        'alert. Use the seeded data from `data:seed`.',
      ].join(' '),
      estimatedBudgetUsd: 4,
    },
    docs: {
      alias: 'docs',
      description: 'Write docs/ARCHITECTURE.md and docs/RUNBOOK.md.',
      prompt: [
        'Write docs/ARCHITECTURE.md (component diagram in ASCII, data flow)',
        'and docs/RUNBOOK.md (boot, reset, common failure modes). Keep each',
        'file under 200 lines.',
      ].join(' '),
      estimatedBudgetUsd: 2,
    },
  },
};
