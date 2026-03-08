export type HarnessName = "opencode" | "claude" | "codex" | "aider" | "gemini"

export interface HarnessDefinition {
  readonly name: HarnessName
  /** Candidate binary names to search for via `which` */
  readonly bins: readonly string[]
  /** Build the argv array for invoking with a given prompt and optional model */
  readonly buildArgs: (prompt: string, model?: string) => readonly string[]
}

export interface ResolvedHarness {
  readonly name: HarnessName
  readonly binPath: string
  readonly buildArgs: (prompt: string, model?: string) => readonly string[]
}

/**
 * The request passed to a `HarnessRunner` when an analysis needs to be performed.
 */
export interface RunRequest {
  /** The full prompt to send to the agent */
  readonly prompt: string
  /**
   * Absolute path to the working directory the agent should operate in.
   * For subprocess runners, this becomes the process cwd.
   * For in-process runners, pass it to the agent's configuration.
   */
  readonly cwd: string
  /**
   * Optional model identifier to use. Runners should ignore this
   * if the underlying agent does not support model selection.
   */
  readonly model?: string
}

/**
 * The result returned by a `HarnessRunner` after a run completes.
 */
export interface RunResult {
  /** The full text output produced by the agent */
  readonly output: string
}

/**
 * Pluggable execution backend for running an AI agent against a prompt.
 *
 * Implement this interface to run any agent — subprocess, in-process function,
 * remote API call, mock, etc. — without changing the rest of cachelyze.
 *
 * The runner is responsible for:
 * - Executing the agent with the given prompt and cwd
 * - Returning the agent's complete text output
 * - Optionally streaming output to stdout as it arrives (for UX)
 *
 * @example In-process runner
 * ```ts
 * class PiRunner implements HarnessRunner {
 *   readonly name = "pi"
 *   async run(req: RunRequest): Promise<RunResult> {
 *     const output = await myAgent.query(req.prompt, { cwd: req.cwd })
 *     return { output }
 *   }
 * }
 * ```
 *
 * @example Minimal mock for testing
 * ```ts
 * class MockRunner implements HarnessRunner {
 *   readonly name = "mock"
 *   async run(_req: RunRequest): Promise<RunResult> {
 *     return { output: "this is a codebase" }
 *   }
 * }
 * ```
 */
export interface HarnessRunner {
  /**
   * A short identifier for this runner. Used in cache entries and result metadata.
   * For subprocess runners this will be the harness name (e.g. "claude").
   * For custom runners, use any stable string that identifies the agent.
   */
  readonly name: string

  /**
   * Execute the agent with the given request and return its output.
   * May stream output to process.stdout as a side effect for live feedback.
   */
  run(request: RunRequest): Promise<RunResult>
}

export interface AnalysisCache {
  readonly gitHash: string
  readonly projectKey: string
  readonly createdAt: string
  /** The runner name used to produce this entry (e.g. "claude", "pi", "my-agent") */
  readonly runner: string
  readonly model?: string
  readonly systemPromptHash?: string
  readonly analysis: string
}

/**
 * The lookup key for a single cache entry.
 * Combines the project identity, commit hash, and optional system-prompt hash
 * so that different analysis "flavours" of the same commit are stored separately.
 */
export interface CacheKey {
  /** Stable identifier for the repository (e.g. "my-app-3f2a1b4c") */
  readonly projectKey: string
  /** Full git commit hash */
  readonly gitHash: string
  /**
   * Short SHA-256 of the system prompt, if one was supplied.
   * Undefined means "use the default (no system prompt) analysis".
   */
  readonly systemPromptHash?: string
}

/**
 * Pluggable storage backend for cachelyze analysis entries.
 *
 * Implement this interface to persist analyses in any backing store
 * (filesystem, database, in-memory map, etc.).
 *
 * @example Minimal custom store
 * ```ts
 * class MyDbStore implements CacheStore {
 *   async get(key: CacheKey) { return db.find(key) ?? null }
 *   async set(key: CacheKey, entry: AnalysisCache) { await db.upsert(key, entry) }
 *   async delete(key: CacheKey) { await db.remove(key) }
 * }
 * ```
 */
export interface CacheStore {
  /**
   * Retrieve a cached entry by key.
   * Returns `null` when no entry exists for the given key.
   */
  get(key: CacheKey): Promise<AnalysisCache | null>

  /**
   * Persist a cache entry under the given key.
   * Implementations should overwrite any existing entry with the same key.
   */
  set(key: CacheKey, entry: AnalysisCache): Promise<void>

  /**
   * Remove the entry for the given key, if it exists.
   * Should resolve without error if the key is not present.
   */
  delete(key: CacheKey): Promise<void>
}

export interface AnalyzeOptions {
  /**
   * Which named harness to use for subprocess execution.
   * Auto-detected from installed tools if omitted.
   * Ignored when a custom `runner` is provided.
   */
  readonly harness?: HarnessName
  /** Model name to pass to the harness or runner */
  readonly model?: string
  /**
   * Appended to the base analysis prompt. Affects the cached run —
   * changing this produces a separate cache entry.
   */
  readonly systemPrompt?: string
  /**
   * Passed only to the working-changes agent. Never cached.
   * Use for targeted questions about the current diff.
   */
  readonly prompt?: string
  /** Working directory. Defaults to process.cwd() */
  readonly cwd?: string
  /** Force re-run even if a valid cache entry exists */
  readonly force?: boolean
  /**
   * Maximum age of a cached entry before it is considered stale and re-run.
   * Expressed in milliseconds.
   *
   * A cached entry whose `createdAt` is older than `Date.now() - maxAge` is
   * treated as a cache miss and the analysis is re-run.
   *
   * When omitted, cached entries never expire (only `force` can bypass them).
   *
   * @example
   * ```ts
   * // Re-run if cache is older than 24 hours
   * await analyze({ maxAge: 24 * 60 * 60 * 1000 })
   * ```
   */
  readonly maxAge?: number
  /**
   * Storage backend for analysis cache entries.
   * Defaults to an in-memory store when not provided.
   * Pass `new FsStore()` for filesystem persistence (what the CLI does).
   */
  readonly store?: CacheStore
  /**
   * Execution backend for running the agent.
   * Defaults to a `SubprocessRunner` auto-detected from installed harnesses.
   *
   * Provide a custom runner to use an in-process agent, a remote API,
   * a test mock, or any other execution strategy.
   *
   * When provided, the `harness` and `model` options are still forwarded
   * to the runner via `RunRequest.model`, but harness auto-detection is skipped.
   */
  readonly runner?: HarnessRunner
}

export interface AnalyzeResult {
  readonly analysis: string
  readonly fromCache: boolean
  readonly gitHash: string
  readonly projectKey: string
  /** The runner name that produced the base analysis */
  readonly runner: string
}

export interface GitInfo {
  readonly hash: string
  readonly repoRoot: string
  readonly hasWorkingChanges: boolean
}

export class CachelyzError extends Error {
  public override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "CachelyzError"
    this.cause = cause
  }
}

export class HarnessNotFoundError extends CachelyzError {
  constructor(requested?: HarnessName) {
    super(
      requested
        ? `Harness "${requested}" is not installed or not found in PATH`
        : "No supported harness found. Install one of: opencode, claude, codex, aider, gemini",
    )
    this.name = "HarnessNotFoundError"
  }
}

export class GitError extends CachelyzError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = "GitError"
  }
}
