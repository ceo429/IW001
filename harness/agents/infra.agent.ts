import { AgentDefinition } from '../types';

/**
 * Infra agent: owns Docker, compose, env, CI, and the simulator.
 * Runs in phase1 alongside the data agent.
 */
export const infraAgent: AgentDefinition = {
  role: 'infra',
  label: 'Infra (Docker/DevOps)',
  defaultModel: 'sonnet',
  dependsOn: [],
  scope: {
    allowedPaths: [
      'infra/**',
      'Dockerfile*',
      '.env*',
      '.github/workflows/**',
      'docker-compose*.yml',
      'scripts/**',
    ],
    forbiddenPaths: [
      'frontend/src/**',
      'backend/src/**',
      'backend/prisma/**',
    ],
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  },
  systemPrompt: [
    'You are the INFRA agent for the IW001 IoT maintenance dashboard.',
    'You own containerization, environment, CI, and the device simulator.',
    '',
    'ALLOWED paths (you may read and write):',
    '  - infra/**',
    '  - Dockerfile*',
    '  - .env*',
    '  - .github/workflows/**',
    '  - docker-compose*.yml',
    '  - scripts/**',
    '',
    'FORBIDDEN paths (never touch):',
    '  - frontend/src/**',
    '  - backend/src/**',
    '  - backend/prisma/**',
    '',
    'Rules:',
    '  1. Multi-stage Dockerfiles. Small final images (distroless or',
    '     node:*-alpine).',
    '  2. All secrets from env; never inline credentials in YAML.',
    '  3. docker-compose.yml must work on a clean host with `docker compose up`.',
    '  4. CI: single workflow with lint / type / test / build stages.',
    '  5. If runtime config needs an app code change, STOP and report',
    '     "needs backend: ..." or "needs frontend: ...".',
  ].join('\n'),
  tasks: {
    up: {
      alias: 'up',
      description: 'Author docker-compose stack (db + redis + api + web).',
      prompt: [
        'Create infra/docker-compose.yml with postgres:16, redis:7, the',
        'backend (built from backend/Dockerfile), and the frontend (built',
        'from frontend/Dockerfile). Add a named volume for pgdata. Include',
        'healthchecks on every service.',
      ].join(' '),
      estimatedBudgetUsd: 3,
    },
    env: {
      alias: 'env',
      description: 'Establish .env.example and env loading.',
      prompt: [
        'Create .env.example at the repo root listing every variable the',
        'stack needs: DATABASE_URL, REDIS_URL, JWT_SECRET, MQTT_URL, etc.',
        'Document each variable with a comment. Add infra/README.md with',
        'the boot sequence.',
      ].join(' '),
      estimatedBudgetUsd: 2,
    },
    simulate: {
      alias: 'simulate',
      description: 'Device telemetry simulator container.',
      prompt: [
        'Create infra/simulator/ with a small Node script that publishes',
        'synthetic telemetry for N devices (configurable via DEVICE_COUNT)',
        'onto Redis pub/sub channel `telemetry.*`. Add a Dockerfile and a',
        '`simulator` service to docker-compose.yml.',
      ].join(' '),
      estimatedBudgetUsd: 3,
    },
    ci: {
      alias: 'ci',
      description: 'GitHub Actions workflow for lint/test/build.',
      prompt: [
        'Create .github/workflows/ci.yml with jobs: lint (eslint + tsc),',
        'test (backend + frontend unit tests), build (docker build both',
        'images). Cache node_modules with actions/setup-node built-in cache.',
      ].join(' '),
      estimatedBudgetUsd: 3,
    },
  },
};
