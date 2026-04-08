/**
 * Core type definitions for the IW001 agent orchestration harness.
 *
 * The harness spawns `claude -p` child processes to run each agent, constrained
 * by an AgentDefinition (role, system prompt, path scope, allowed tools, task
 * aliases). Orchestration primitives (parallel / chain / phase) compose those
 * single runs into full workflows.
 */

export type AgentRole =
  | 'frontend'
  | 'backend'
  | 'data'
  | 'infra'
  | 'qa';

export type AgentState =
  | 'idle'
  | 'queued'
  | 'running'
  | 'done'
  | 'error';

/**
 * Path scope + tool allowlist enforced when spawning the agent. The harness
 * passes allowedTools to `claude -p --allowedTools ...` and embeds the
 * allowed/forbidden paths directly in the system prompt so the agent is
 * explicitly told what it may touch.
 */
export interface AgentScope {
  /** Glob patterns the agent is allowed to read/modify. */
  allowedPaths: string[];
  /** Glob patterns the agent must never touch. */
  forbiddenPaths: string[];
  /** Tools passed to `claude -p --allowedTools ...`. */
  allowedTools: string[];
}

/**
 * A named shortcut that maps to a concrete prompt. `harness run backend migrate`
 * resolves the `migrate` alias on the backend agent.
 */
export interface TaskAlias {
  alias: string;
  description: string;
  prompt: string;
  /** Estimated USD budget - caps spend via --max-budget-usd. */
  estimatedBudgetUsd?: number;
  /** Override the default model for a heavy task. */
  model?: 'sonnet' | 'opus' | 'haiku';
}

export interface AgentDefinition {
  role: AgentRole;
  /** Human-readable label used in the status dashboard. */
  label: string;
  /** Default model for ad-hoc prompts on this agent. */
  defaultModel: 'sonnet' | 'opus' | 'haiku';
  /** Full system prompt fed to `claude -p --system-prompt`. */
  systemPrompt: string;
  scope: AgentScope;
  /** Other agents that must complete before this one runs in phase mode. */
  dependsOn: AgentRole[];
  /** alias -> task mapping. */
  tasks: Record<string, TaskAlias>;
}

/**
 * A single unit of orchestration: "run agent X with task Y (or a raw prompt)".
 * Steps compose into parallel groups and chains.
 */
export interface ChainStep {
  agent: AgentRole;
  /** Either a known alias name or a raw prompt starting with '"'. */
  task: string;
  /** Optional raw prompt override (takes precedence over alias lookup). */
  rawPrompt?: string;
}

/**
 * A phase is a sequence of groups, where each group runs in parallel and the
 * next group starts only after the previous finishes. This is the "parallel
 * within, serial between" pattern used by phase1/phase2/phase3.
 */
export interface PhaseDefinition {
  name: string;
  description: string;
  groups: ChainStep[][];
}

/**
 * A preset is a macro: a named sequence of phases or chains, the highest-level
 * building block. `harness preset full-rebuild` runs phase1 -> phase2 -> phase3.
 */
export interface PresetDefinition {
  name: string;
  description: string;
  /** Either phase names (strings) or raw ChainStep[] groups. */
  steps: Array<
    | { kind: 'phase'; phase: string }
    | { kind: 'chain'; steps: ChainStep[] }
    | { kind: 'parallel'; steps: ChainStep[] }
  >;
}

/**
 * Top-level harness configuration assembled in harness.config.ts.
 */
export interface HarnessConfig {
  agents: Record<AgentRole, AgentDefinition>;
  phases: Record<string, PhaseDefinition>;
  presets: Record<string, PresetDefinition>;
  defaults: {
    model: 'sonnet' | 'opus' | 'haiku';
    maxBudgetUsd: number;
    permissionMode: 'bypassPermissions' | 'acceptEdits' | 'plan' | 'default';
    outputFormat: 'json' | 'stream-json' | 'text';
    /** Directory (relative to repo root) where run logs are written. */
    logDir: string;
  };
}

/**
 * Runtime record for a single agent invocation. The orchestrator keeps these
 * in-memory for the status dashboard and persists them as JSON lines to logDir.
 */
export interface AgentRun {
  id: string;
  role: AgentRole;
  state: AgentState;
  /** Task alias name, or "<inline>" for raw prompts. */
  task: string;
  /** Resolved prompt actually sent to claude -p. */
  prompt: string;
  model: string;
  startedAt?: number;
  endedAt?: number;
  /** Brief one-line summary extracted from the agent's JSON result. */
  summary?: string;
  /** Exit code of the spawned process; 0 on success. */
  exitCode?: number;
  /** Full stdout (JSON payload from claude -p --output-format json). */
  stdout?: string;
  /** Full stderr, captured for debugging. */
  stderr?: string;
  /** Any error thrown during spawn / parsing. */
  error?: string;
}

/**
 * Aggregate result of a multi-step orchestration (parallel / chain / phase).
 */
export interface OrchestrationResult {
  ok: boolean;
  runs: AgentRun[];
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
  /** Present when the orchestration halted early (chain / phase failure). */
  failedAt?: { group: number; step: number; run: AgentRun };
}
