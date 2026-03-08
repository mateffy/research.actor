/**
 * research
 *
 * Cached codebase analysis for AI coding agents.
 *
 * @alpha This package is in early development. APIs may change without notice.
 *
 * @example
 * ```ts
 * import { analyze } from "research"
 *
 * const result = await analyze({ prompt: "focus on the auth system" })
 * console.log(result.analysis)
 * ```
 */

// Re-export everything from @research.actor/core
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
} from "@research.actor/core"

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
} from "@research.actor/core"

/**
 * Package metadata.
 */
export const RESEARCH_VERSION = "0.4.2" as const

/**
 * Alpha release notice. This package is under active development.
 * Subscribe to https://github.com/mateffy/research.actor for updates.
 */
export const RELEASE_STATUS = "alpha" as const
