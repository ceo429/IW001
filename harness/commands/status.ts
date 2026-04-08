import * as fs from 'fs';
import * as path from 'path';
import Table from 'cli-table3';
import chalk from 'chalk';
import { AgentRun, AgentState, HarnessConfig } from '../types';

/**
 * Render the status dashboard by reading the JSONL log that the orchestrator
 * writes. Prints one row per most-recent run per agent role.
 */
export function renderStatus(
  config: HarnessConfig,
  repoRoot: string,
): string {
  const logFile = path.join(
    repoRoot,
    config.defaults.logDir,
    'runs.jsonl',
  );

  let runs: AgentRun[] = [];
  if (fs.existsSync(logFile)) {
    const raw = fs.readFileSync(logFile, 'utf8').trim();
    if (raw) {
      runs = raw
        .split('\n')
        .map((line) => {
          try {
            return JSON.parse(line) as AgentRun;
          } catch {
            return null;
          }
        })
        .filter((r): r is AgentRun => r !== null);
    }
  }

  // Keep the most recent run per role.
  const latest = new Map<string, AgentRun>();
  for (const run of runs) {
    const prev = latest.get(run.role);
    if (!prev || (run.startedAt ?? 0) > (prev.startedAt ?? 0)) {
      latest.set(run.role, run);
    }
  }

  const table = new Table({
    head: ['Agent', 'State', 'Time', 'Task', 'Summary'].map((h) =>
      chalk.bold(h),
    ),
    colWidths: [12, 12, 10, 16, 46],
    wordWrap: true,
  });

  const roles = Object.keys(config.agents);
  for (const role of roles) {
    const run = latest.get(role);
    if (!run) {
      table.push([
        chalk.cyan(role),
        chalk.gray('— idle'),
        '--',
        '--',
        chalk.gray('no runs yet'),
      ]);
      continue;
    }
    table.push([
      chalk.cyan(run.role),
      stateBadge(run.state),
      formatDuration(run),
      run.task,
      run.summary ?? (run.error ? chalk.red(run.error) : ''),
    ]);
  }

  return table.toString();
}

function stateBadge(state: AgentState): string {
  switch (state) {
    case 'done':
      return chalk.green('✅ done');
    case 'error':
      return chalk.red('❌ error');
    case 'running':
      return chalk.yellow('🔄 run');
    case 'queued':
      return chalk.blue('⏳ queue');
    case 'idle':
    default:
      return chalk.gray('— idle');
  }
}

function formatDuration(run: AgentRun): string {
  if (!run.startedAt) return '--';
  const end = run.endedAt ?? Date.now();
  const s = Math.floor((end - run.startedAt) / 1000);
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}
