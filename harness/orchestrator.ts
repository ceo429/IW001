import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  AgentDefinition,
  AgentRole,
  AgentRun,
  ChainStep,
  HarnessConfig,
  OrchestrationResult,
  TaskAlias,
} from './types';

/**
 * Orchestrator: owns the single concept of "run one agent as a claude -p
 * child process" and composes it into parallel groups, chains, and phases.
 *
 * It does NOT know anything about the CLI layer - the CLI in cli.ts builds
 * ChainStep[] arrays and calls into here.
 */
export class Orchestrator {
  private readonly runs: Map<string, AgentRun> = new Map();
  private readonly config: HarnessConfig;
  private readonly repoRoot: string;

  constructor(config: HarnessConfig, repoRoot: string) {
    this.config = config;
    this.repoRoot = repoRoot;
    this.ensureLogDir();
  }

  /** Snapshot of all runs, in insertion order. */
  public getRuns(): AgentRun[] {
    return Array.from(this.runs.values());
  }

  // -------------------------------------------------------------------------
  // Step resolution
  // -------------------------------------------------------------------------

  /**
   * Resolve a ChainStep against the agent's task aliases, returning the
   * effective prompt + model + budget. If `rawPrompt` is set, it wins.
   */
  private resolveStep(step: ChainStep): {
    agent: AgentDefinition;
    taskLabel: string;
    prompt: string;
    model: string;
    budgetUsd: number;
  } {
    const agent = this.config.agents[step.agent];
    if (!agent) {
      throw new Error(`Unknown agent role: ${step.agent}`);
    }

    // Raw prompt override: either explicit rawPrompt, or task wrapped in quotes.
    if (step.rawPrompt !== undefined) {
      return {
        agent,
        taskLabel: '<inline>',
        prompt: step.rawPrompt,
        model: agent.defaultModel,
        budgetUsd: this.config.defaults.maxBudgetUsd,
      };
    }

    const alias: TaskAlias | undefined = agent.tasks[step.task];
    if (!alias) {
      // Not a known alias - treat as a raw prompt.
      return {
        agent,
        taskLabel: '<inline>',
        prompt: step.task,
        model: agent.defaultModel,
        budgetUsd: this.config.defaults.maxBudgetUsd,
      };
    }

    return {
      agent,
      taskLabel: alias.alias,
      prompt: alias.prompt,
      model: alias.model ?? agent.defaultModel,
      budgetUsd: alias.estimatedBudgetUsd ?? this.config.defaults.maxBudgetUsd,
    };
  }

  // -------------------------------------------------------------------------
  // Core: single agent run via `claude -p`
  // -------------------------------------------------------------------------

  /**
   * Spawn a single `claude -p` child process for the given step and wait for
   * it to finish. Returns the AgentRun record (success OR failure).
   */
  public async runAgent(step: ChainStep): Promise<AgentRun> {
    const resolved = this.resolveStep(step);
    const { agent, taskLabel, prompt, model, budgetUsd } = resolved;

    const run: AgentRun = {
      id: randomUUID(),
      role: agent.role,
      state: 'running',
      task: taskLabel,
      prompt,
      model,
      startedAt: Date.now(),
    };
    this.runs.set(run.id, run);
    this.logLine(
      `[${agent.role}] ▶ ${taskLabel} (model=${model}, budget=$${budgetUsd})`,
    );

    // Build the full system prompt: role system prompt + explicit path scope.
    const fullSystemPrompt = this.buildSystemPrompt(agent);

    const args: string[] = [
      '-p',
      prompt,
      '--system-prompt',
      fullSystemPrompt,
      '--output-format',
      this.config.defaults.outputFormat,
      '--permission-mode',
      this.config.defaults.permissionMode,
      '--model',
      model,
      '--allowedTools',
      agent.scope.allowedTools.join(','),
      '--max-budget-usd',
      String(budgetUsd),
    ];

    try {
      const { stdout, stderr, exitCode } = await this.spawnClaude(args);
      run.stdout = stdout;
      run.stderr = stderr;
      run.exitCode = exitCode;
      run.endedAt = Date.now();

      if (exitCode === 0) {
        run.state = 'done';
        run.summary = this.extractSummary(stdout);
        this.logLine(
          `[${agent.role}] ✅ ${taskLabel} (${this.formatDuration(run)})`,
        );
      } else {
        run.state = 'error';
        run.error = `claude -p exited with code ${exitCode}`;
        run.summary = this.extractSummary(stdout) ?? stderr.split('\n')[0];
        this.logLine(
          `[${agent.role}] ❌ ${taskLabel} exit=${exitCode} (${this.formatDuration(run)})`,
        );
      }
    } catch (err) {
      run.endedAt = Date.now();
      run.state = 'error';
      run.error = err instanceof Error ? err.message : String(err);
      this.logLine(`[${agent.role}] ❌ ${taskLabel} spawn-error: ${run.error}`);
    }

    this.persistRun(run);
    return run;
  }

  /**
   * Build the full system prompt fed to `claude -p --system-prompt`. We
   * append the ALLOWED / FORBIDDEN scope so the agent is explicitly told
   * what it may touch, on top of the tool allowlist.
   */
  private buildSystemPrompt(agent: AgentDefinition): string {
    const lines: string[] = [
      agent.systemPrompt,
      '',
      '--- HARNESS SCOPE (enforced at the tool layer) ---',
      `Role: ${agent.role}`,
      `Allowed tools: ${agent.scope.allowedTools.join(', ')}`,
      `Allowed paths: ${agent.scope.allowedPaths.join(', ')}`,
      `Forbidden paths: ${agent.scope.forbiddenPaths.join(', ')}`,
      '',
      'Work only on files under the allowed paths. If your task requires',
      'changes outside that scope, STOP and report a "needs <other-role>: ..."',
      'message instead of editing forbidden files.',
    ];
    return lines.join('\n');
  }

  // -------------------------------------------------------------------------
  // Composition primitives: parallel, chain, phase
  // -------------------------------------------------------------------------

  /**
   * Run all steps concurrently via Promise.all. Never throws; each run's
   * state reflects its own success/failure.
   */
  public async runParallel(steps: ChainStep[]): Promise<OrchestrationResult> {
    const startedAt = Date.now();
    const runs = await Promise.all(steps.map((s) => this.runAgent(s)));
    return {
      ok: runs.every((r) => r.state === 'done'),
      runs,
      durationMs: Date.now() - startedAt,
    };
  }

  /**
   * Run steps sequentially. If any step errors, the chain halts and
   * subsequent steps are recorded as 'idle' (never run).
   */
  public async runChain(steps: ChainStep[]): Promise<OrchestrationResult> {
    const startedAt = Date.now();
    const runs: AgentRun[] = [];
    for (let i = 0; i < steps.length; i++) {
      const run = await this.runAgent(steps[i]);
      runs.push(run);
      if (run.state === 'error') {
        return {
          ok: false,
          runs,
          durationMs: Date.now() - startedAt,
          failedAt: { group: 0, step: i, run },
        };
      }
    }
    return { ok: true, runs, durationMs: Date.now() - startedAt };
  }

  /**
   * Run a phase: an ordered list of parallel groups. Each group must fully
   * succeed before the next group starts. On any failure, the phase halts.
   */
  public async runPhase(phaseName: string): Promise<OrchestrationResult> {
    const phase = this.config.phases[phaseName];
    if (!phase) throw new Error(`Unknown phase: ${phaseName}`);
    const startedAt = Date.now();
    const allRuns: AgentRun[] = [];

    for (let g = 0; g < phase.groups.length; g++) {
      const group = phase.groups[g];
      this.logLine(
        `=== phase=${phaseName} group=${g + 1}/${phase.groups.length} (${group.length} parallel) ===`,
      );
      const result = await this.runParallel(group);
      allRuns.push(...result.runs);
      if (!result.ok) {
        const failedRun = result.runs.find((r) => r.state === 'error')!;
        const failedIdx = result.runs.indexOf(failedRun);
        return {
          ok: false,
          runs: allRuns,
          durationMs: Date.now() - startedAt,
          failedAt: { group: g, step: failedIdx, run: failedRun },
        };
      }
    }

    return { ok: true, runs: allRuns, durationMs: Date.now() - startedAt };
  }

  /**
   * Run a preset - a macro over phases / chains / parallel groups.
   */
  public async runPreset(presetName: string): Promise<OrchestrationResult> {
    const preset = this.config.presets[presetName];
    if (!preset) throw new Error(`Unknown preset: ${presetName}`);
    const startedAt = Date.now();
    const allRuns: AgentRun[] = [];

    for (const step of preset.steps) {
      let result: OrchestrationResult;
      if (step.kind === 'phase') {
        result = await this.runPhase(step.phase);
      } else if (step.kind === 'chain') {
        result = await this.runChain(step.steps);
      } else {
        result = await this.runParallel(step.steps);
      }
      allRuns.push(...result.runs);
      if (!result.ok) {
        return {
          ok: false,
          runs: allRuns,
          durationMs: Date.now() - startedAt,
          failedAt: result.failedAt,
        };
      }
    }

    return { ok: true, runs: allRuns, durationMs: Date.now() - startedAt };
  }

  // -------------------------------------------------------------------------
  // claude -p spawning + output parsing
  // -------------------------------------------------------------------------

  /**
   * Spawn `claude` with the given args, capture stdout/stderr fully, and
   * resolve with exitCode. Rejects only on spawn errors (ENOENT etc.).
   */
  private spawnClaude(
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn('claude', args, {
        cwd: this.repoRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });
      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });
    });
  }

  /**
   * Pull a one-line summary out of claude -p --output-format json. The
   * payload shape is `{ result: "...", ... }` - we take the first non-empty
   * line, clipped to 80 chars.
   */
  private extractSummary(stdout: string): string | undefined {
    if (!stdout.trim()) return undefined;
    try {
      const parsed = JSON.parse(stdout);
      const text: unknown =
        parsed.result ?? parsed.message ?? parsed.output ?? parsed.text;
      if (typeof text === 'string') return this.clip(text);
    } catch {
      // not JSON - fall through
    }
    const firstLine = stdout.split('\n').find((l) => l.trim().length > 0);
    return firstLine ? this.clip(firstLine) : undefined;
  }

  private clip(s: string, n = 80): string {
    const trimmed = s.trim().replace(/\s+/g, ' ');
    return trimmed.length > n ? trimmed.slice(0, n - 1) + '…' : trimmed;
  }

  private formatDuration(run: AgentRun): string {
    if (!run.startedAt || !run.endedAt) return '--';
    const s = Math.floor((run.endedAt - run.startedAt) / 1000);
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  }

  // -------------------------------------------------------------------------
  // Logging + persistence
  // -------------------------------------------------------------------------

  private ensureLogDir(): void {
    const dir = path.join(this.repoRoot, this.config.defaults.logDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  private logLine(msg: string): void {
    // eslint-disable-next-line no-console
    console.log(msg);
  }

  /** Append a JSON line record for this run to logDir/runs.jsonl. */
  private persistRun(run: AgentRun): void {
    const file = path.join(
      this.repoRoot,
      this.config.defaults.logDir,
      'runs.jsonl',
    );
    const record = {
      id: run.id,
      role: run.role,
      task: run.task,
      state: run.state,
      model: run.model,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      exitCode: run.exitCode,
      summary: run.summary,
      error: run.error,
    };
    try {
      fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
    } catch {
      // best-effort; don't kill the run over a log write
    }
  }
}

/**
 * Parse a step shorthand "agent:task" into a ChainStep. Accepts both
 * "backend:routes" and "backend:"please build me a cache"" forms - if the
 * right side starts with a quote, we strip the quotes and treat it as a raw
 * prompt.
 */
export function parseStepShorthand(shorthand: string): ChainStep {
  const sep = shorthand.indexOf(':');
  if (sep < 0) {
    throw new Error(
      `Invalid step "${shorthand}". Expected "agent:task" or 'agent:"prompt"'.`,
    );
  }
  const agent = shorthand.slice(0, sep).trim() as AgentRole;
  const rest = shorthand.slice(sep + 1).trim();

  if (
    (rest.startsWith('"') && rest.endsWith('"')) ||
    (rest.startsWith("'") && rest.endsWith("'"))
  ) {
    return { agent, task: '<inline>', rawPrompt: rest.slice(1, -1) };
  }
  return { agent, task: rest };
}
