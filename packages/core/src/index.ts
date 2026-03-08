// Main API
export { analyze } from "./analyze.js"

// Runners
export { SubprocessRunner, resolveSubprocessRunner, detectHarnesses, resolveHarness } from "./harness.js"
export { invokeHarness } from "./harness.js" // @deprecated

// Cache stores
export { FsStore, hashSystemPrompt } from "./stores/fs.js"
export { MemoryStore } from "./stores/memory.js"

// Lower-level utilities (SDK surface)
export { getGitInfo, getRepoRoot, getCurrentHash, hasWorkingChanges } from "./git.js"
export { deriveProjectKey } from "./config.js"
export { buildBaseAnalysisPrompt, buildWorkingChangesPrompt } from "./prompts.js"

// Types
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
} from "./types.js"

export { CachelyzError, HarnessNotFoundError, GitError } from "./types.js"
