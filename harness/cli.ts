#!/usr/bin/env node
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { harnessConfig } from './harness.config';
import { Orchestrator, parseStepShorthand } from './orchestrator';
import { renderStatus } from './commands/status';
import { AgentRole, ChainStep, OrchestrationResult } from './types';

/**
 * CLI entry point. Each command builds ChainStep[] arrays (or looks up a
 * phase / preset) and hands them to the Orchestrator.
 *
 * Examples:
 *   harness run data seed
 *   harness run backend "Redis 캐시 레이어를 추가해"
 *   harness parallel data:seed infra:up
 *   harness chain data:sync backend:migrate qa:test
 *   harness phase phase1
 *   harness preset full-rebuild
 *   harness status
 *   harness help backend
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const orchestrator = new Orchestrator(harnessConfig, REPO_ROOT);

const program = new Command();
program
  .name('harness')
  .description('IW001 agent orchestration harness')
  .version('0.1.0');

// ---------------------------------------------------------------------------
// run <agent> <task-or-prompt>
// ---------------------------------------------------------------------------
program
  .command('run <agent> <taskOrPrompt...>')
  .description('Run a single agent with either a task alias or a raw prompt')
  .action(async (agent: string, taskOrPrompt: string[]) => {
    assertAgent(agent);
    const joined = taskOrPrompt.join(' ');

    // If the first word matches a known alias, treat as alias. Otherwise the
    // whole string is a raw prompt.
    const aliases = harnessConfig.agents[agent as AgentRole].tasks;
    let step: ChainStep;
    if (taskOrPrompt.length === 1 && aliases[taskOrPrompt[0]]) {
      step = { agent: agent as AgentRole, task: taskOrPrompt[0] };
    } else {
      step = { agent: agent as AgentRole, task: '<inline>', rawPrompt: joined };
    }

    const run = await orchestrator.runAgent(step);
    printRunFooter([run], run.state === 'done');
    process.exit(run.state === 'done' ? 0 : 1);
  });

// ---------------------------------------------------------------------------
// parallel <step> <step>... — Promise.all of agent runs
// ---------------------------------------------------------------------------
program
  .command('parallel <steps...>')
  .description('Run multiple agent:task steps in parallel')
  .action(async (steps: string[]) => {
    const parsed = steps.map(parseStepShorthand);
    parsed.forEach((s) => assertAgent(s.agent));
    console.log(chalk.bold(`▶ parallel: ${steps.join(' ')}`));
    const result = await orchestrator.runParallel(parsed);
    printRunFooter(result.runs, result.ok);
    process.exit(result.ok ? 0 : 1);
  });

// ---------------------------------------------------------------------------
// chain <step> <step>... — sequential, halt on first failure
// ---------------------------------------------------------------------------
program
  .command('chain <steps...>')
  .description('Run multiple agent:task steps sequentially')
  .action(async (steps: string[]) => {
    const parsed = steps.map(parseStepShorthand);
    parsed.forEach((s) => assertAgent(s.agent));
    console.log(chalk.bold(`▶ chain: ${steps.join(' → ')}`));
    const result = await orchestrator.runChain(parsed);
    printRunFooter(result.runs, result.ok);
    if (!result.ok && result.failedAt) {
      console.log(
        chalk.red(
          `✗ halted at step ${result.failedAt.step + 1}: ${result.failedAt.run.role}:${result.failedAt.run.task}`,
        ),
      );
    }
    process.exit(result.ok ? 0 : 1);
  });

// ---------------------------------------------------------------------------
// phase <name>
// ---------------------------------------------------------------------------
program
  .command('phase <name>')
  .description(
    `Run a named phase (${Object.keys(harnessConfig.phases).join(', ')})`,
  )
  .action(async (name: string) => {
    if (!harnessConfig.phases[name]) {
      console.error(
        chalk.red(
          `Unknown phase "${name}". Available: ${Object.keys(harnessConfig.phases).join(', ')}`,
        ),
      );
      process.exit(2);
    }
    console.log(
      chalk.bold(
        `▶ phase: ${name} — ${harnessConfig.phases[name].description}`,
      ),
    );
    const result = await orchestrator.runPhase(name);
    printRunFooter(result.runs, result.ok);
    process.exit(result.ok ? 0 : 1);
  });

// ---------------------------------------------------------------------------
// preset <name>
// ---------------------------------------------------------------------------
program
  .command('preset <name>')
  .description(
    `Run a named preset (${Object.keys(harnessConfig.presets).join(', ')})`,
  )
  .action(async (name: string) => {
    if (!harnessConfig.presets[name]) {
      console.error(
        chalk.red(
          `Unknown preset "${name}". Available: ${Object.keys(harnessConfig.presets).join(', ')}`,
        ),
      );
      process.exit(2);
    }
    console.log(
      chalk.bold(
        `▶ preset: ${name} — ${harnessConfig.presets[name].description}`,
      ),
    );
    const result = await orchestrator.runPreset(name);
    printRunFooter(result.runs, result.ok);
    process.exit(result.ok ? 0 : 1);
  });

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------
program
  .command('status')
  .description('Show the agent status dashboard (from run log)')
  .action(() => {
    console.log(renderStatus(harnessConfig, REPO_ROOT));
  });

// ---------------------------------------------------------------------------
// help <agent>
// ---------------------------------------------------------------------------
program
  .command('help <agent>')
  .description('List task aliases for an agent')
  .action((agent: string) => {
    assertAgent(agent);
    const def = harnessConfig.agents[agent as AgentRole];
    console.log(chalk.bold(`\n${def.label}  (role=${def.role})`));
    console.log(
      chalk.gray(
        `  default model: ${def.defaultModel}    depends on: ${def.dependsOn.join(', ') || '—'}`,
      ),
    );
    console.log(chalk.gray(`  allowed: ${def.scope.allowedPaths.join(', ')}`));
    console.log(
      chalk.gray(`  forbidden: ${def.scope.forbiddenPaths.join(', ')}`),
    );
    console.log('');
    for (const alias of Object.values(def.tasks)) {
      const model = alias.model ? ` [${alias.model}]` : '';
      const budget = alias.estimatedBudgetUsd
        ? ` ($${alias.estimatedBudgetUsd})`
        : '';
      console.log(
        `  ${chalk.green(alias.alias.padEnd(14))} ${alias.description}${chalk.gray(model + budget)}`,
      );
    }
    console.log('');
  });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertAgent(agent: string): void {
  if (!(agent in harnessConfig.agents)) {
    console.error(
      chalk.red(
        `Unknown agent "${agent}". Available: ${Object.keys(harnessConfig.agents).join(', ')}`,
      ),
    );
    process.exit(2);
  }
}

function printRunFooter(
  runs: OrchestrationResult['runs'],
  ok: boolean,
): void {
  console.log('');
  console.log(renderStatus(harnessConfig, REPO_ROOT));
  const okCount = runs.filter((r) => r.state === 'done').length;
  const errCount = runs.filter((r) => r.state === 'error').length;
  const label = ok
    ? chalk.green(`✓ ${okCount} ok`)
    : chalk.red(`✗ ${errCount} failed, ${okCount} ok`);
  console.log(`\n${label}  (${runs.length} run${runs.length === 1 ? '' : 's'})`);
}

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
});
