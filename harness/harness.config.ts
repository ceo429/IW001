import { HarnessConfig } from './types';
import { frontendAgent } from './agents/frontend.agent';
import { backendAgent } from './agents/backend.agent';
import { dataAgent } from './agents/data.agent';
import { infraAgent } from './agents/infra.agent';
import { qaAgent } from './agents/qa.agent';

/**
 * The assembled harness configuration.
 *
 * - agents:  the 5 role definitions (frontend, backend, data, infra, qa)
 * - phases:  named parallel-then-serial workflows (phase1/2/3)
 * - presets: high-level macros (full-rebuild, quick-fix, deploy-prep)
 * - defaults: model, budget, permission mode, output format, log directory
 */
export const harnessConfig: HarnessConfig = {
  agents: {
    frontend: frontendAgent,
    backend: backendAgent,
    data: dataAgent,
    infra: infraAgent,
    qa: qaAgent,
  },

  phases: {
    phase1: {
      name: 'phase1',
      description: 'Foundation: schema + infra boot',
      groups: [
        // group 1: set up DB schema & env in parallel
        [
          { agent: 'data', task: 'sync' },
          { agent: 'infra', task: 'env' },
        ],
        // group 2: seed data + bring containers up in parallel
        [
          { agent: 'data', task: 'seed' },
          { agent: 'infra', task: 'up' },
        ],
      ],
    },
    phase2: {
      name: 'phase2',
      description: 'Application: backend & frontend build-out',
      groups: [
        [
          { agent: 'backend', task: 'migrate' },
          { agent: 'frontend', task: 'init' },
        ],
        [
          { agent: 'backend', task: 'routes' },
          { agent: 'frontend', task: 'componentize' },
        ],
        [
          { agent: 'backend', task: 'services' },
          { agent: 'frontend', task: 'api-hooks' },
        ],
      ],
    },
    phase3: {
      name: 'phase3',
      description: 'Quality: tests + docs + e2e',
      groups: [
        [
          { agent: 'qa', task: 'api-test' },
          { agent: 'qa', task: 'docs' },
        ],
        [{ agent: 'qa', task: 'e2e' }],
      ],
    },
  },

  presets: {
    'full-rebuild': {
      name: 'full-rebuild',
      description: 'phase1 -> phase2 -> phase3 (ground-up build)',
      steps: [
        { kind: 'phase', phase: 'phase1' },
        { kind: 'phase', phase: 'phase2' },
        { kind: 'phase', phase: 'phase3' },
      ],
    },
    'quick-fix': {
      name: 'quick-fix',
      description: 'Service hot-patch + API smoke test',
      steps: [
        {
          kind: 'chain',
          steps: [
            { agent: 'backend', task: 'services' },
            { agent: 'qa', task: 'api-test' },
          ],
        },
      ],
    },
    'deploy-prep': {
      name: 'deploy-prep',
      description: 'phase2 -> phase3 (assumes data + infra already green)',
      steps: [
        { kind: 'phase', phase: 'phase2' },
        { kind: 'phase', phase: 'phase3' },
      ],
    },
  },

  defaults: {
    model: 'sonnet',
    maxBudgetUsd: 5,
    permissionMode: 'bypassPermissions',
    outputFormat: 'json',
    logDir: '.harness/logs',
  },
};

export default harnessConfig;
