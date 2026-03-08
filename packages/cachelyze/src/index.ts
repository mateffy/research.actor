/**
 * cachelyze
 *
 * Cached codebase analysis for AI coding agents.
 *
 * @alpha This package is in early development. APIs may change without notice.
 *
 * @example
 * ```ts
 * import { analyze } from "cachelyze"
 *
 * const result = await analyze({ prompt: "focus on the auth system" })
 * console.log(result.analysis)
 * ```
 */

// Re-export the full core SDK
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
 *
 * @alpha
 */
export const CACHELYZE_VERSION = "0.1.0" as const

/**
 * Alpha release notice. This package is under active development.
 * Subscribe to https://github.com/your-org/cachelyze for updates.
 *
 * @alpha
 */
export const RELEASE_STATUS = "alpha" as const
