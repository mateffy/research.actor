/**
 * research.actor
 *
 * Cached codebase analysis for AI coding agents.
 * This is an alias package for cachelyze.
 *
 * @alpha This package is in early development. APIs may change without notice.
 *
 * @example
 * ```ts
 * import { analyze } from "research.actor"
 *
 * const result = await analyze({ prompt: "focus on the auth system" })
 * console.log(result.analysis)
 * ```
 */

// Re-export everything from @cachelyze/core (same as cachelyze package)
export {
  analyze,
  detectHarnesses,
  resolveHarness,
  resolveSubprocessRunner,
  SubprocessRunner,
  invokeHarness,
  getGitInfo,
  getRepoRoot,
  getCurrentHash,
  hasWorkingChanges,
  deriveProjectKey,
  buildBaseAnalysisPrompt,
  buildWorkingChangesPrompt,
  FsStore,
  MemoryStore,
  hashSystemPrompt,
  CachelyzError,
  HarnessNotFoundError,
  GitError,
} from "@cachelyze/core"

export type {
  HarnessName,
  HarnessDefinition,
  ResolvedHarness,
  HarnessRunner,
  RunRequest,
  RunResult,
  AnalysisCache,
  CacheKey,
  CacheStore,
  AnalyzeOptions,
  AnalyzeResult,
  GitInfo,
} from "@cachelyze/core"

/**
 * Package metadata.
 */
export const RESEARCH_ACTOR_VERSION = "0.2.1" as const

/**
 * Alpha release notice. This package is under active development.
 * Subscribe to https://github.com/mateffy/cachelyze for updates.
 */
export const RELEASE_STATUS = "alpha" as const
