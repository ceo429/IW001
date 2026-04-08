import { AgentDefinition } from '../types';

/**
 * Frontend agent: owns the React dashboard UI.
 * Scope: everything under frontend/ plus the top-level iot_dashboard_app.jsx.
 */
export const frontendAgent: AgentDefinition = {
  role: 'frontend',
  label: 'Frontend (React)',
  defaultModel: 'sonnet',
  dependsOn: [],
  scope: {
    allowedPaths: [
      'frontend/**',
      'iot_dashboard_app.jsx',
      '*.jsx',
      '*.tsx',
    ],
    forbiddenPaths: [
      'backend/**',
      'infra/**',
      'backend/prisma/**',
      '**/tests/api/**',
    ],
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
  },
  systemPrompt: [
    'You are the FRONTEND agent for the IW001 IoT maintenance dashboard.',
    'Your sole responsibility is the React UI layer.',
    '',
    'ALLOWED paths (you may read and write):',
    '  - frontend/**',
    '  - iot_dashboard_app.jsx',
    '  - *.jsx, *.tsx',
    '',
    'FORBIDDEN paths (never touch):',
    '  - backend/**',
    '  - infra/**',
    '  - backend/prisma/**',
    '',
    'Rules:',
    '  1. Functional React components with hooks only. No class components.',
    '  2. Use Tailwind for styling when stylesheets are present.',
    '  3. Use `recharts` for charting, `lucide-react` for icons.',
    '  4. Consume backend APIs via a typed client under frontend/src/api/.',
    '  5. If you need a backend change, STOP and report "needs backend: ..."',
    '     instead of editing backend files.',
    '  6. Commit only the files you changed; no speculative refactors.',
  ].join('\n'),
  tasks: {
    init: {
      alias: 'init',
      description: 'Scaffold a Vite + React + TS project under frontend/.',
      prompt: [
        'Scaffold a Vite + React + TypeScript project under frontend/.',
        'Install tailwindcss, recharts, lucide-react, axios. Wire up a base',
        'App shell with a sidebar, header, and a main content slot. Do not',
        'implement feature screens yet - just the shell.',
      ].join(' '),
      estimatedBudgetUsd: 3,
    },
    componentize: {
      alias: 'componentize',
      description: 'Split iot_dashboard_app.jsx into feature components.',
      prompt: [
        'Read iot_dashboard_app.jsx and split it into feature components under',
        'frontend/src/components/ (DeviceList, DeviceDetail, AlertPanel,',
        'MetricsChart, MaintenanceQueue). Keep behavior identical.',
      ].join(' '),
      estimatedBudgetUsd: 4,
    },
    'api-hooks': {
      alias: 'api-hooks',
      description: 'Generate typed API hooks from api-spec.yaml.',
      prompt: [
        'Read api-spec.yaml and generate React Query hooks under',
        'frontend/src/api/hooks/ for each endpoint. Use axios as the client.',
        'Export a single useApi() provider at frontend/src/api/index.ts.',
      ].join(' '),
      estimatedBudgetUsd: 3,
    },
    charts: {
      alias: 'charts',
      description: 'Build telemetry charts with recharts.',
      prompt: [
        'Under frontend/src/components/charts/, build TelemetryLineChart,',
        'DeviceHealthGauge, and AlertHeatmap using recharts. Props: data,',
        'timeRange, onSelect. Add basic Storybook stories if Storybook exists.',
      ].join(' '),
      estimatedBudgetUsd: 3,
    },
  },
};
