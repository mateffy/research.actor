import { deriveProjectKey } from "./config.js"
import { getGitInfo } from "./git.js"
import { resolveSubprocessRunner } from "./harness.js"
import { buildBaseAnalysisPrompt, buildWorkingChangesPrompt } from "./prompts.js"
import { MemoryStore } from "./stores/memory.js"
import { hashSystemPrompt } from "./stores/fs.js"
import type { AnalysisCache, AnalyzeOptions, AnalyzeResult, CacheKey } from "./types.js"

/**
 * Main entry point. Produces (or returns from cache) a codebase analysis.
 *
 * Flow:
 *  1. Resolve cwd, git hash, project key
 *  2. Build the CacheKey and look up the store
 *  3. Cache miss → run base analysis via runner → write to store
 *  4. Cache hit → read from store
 *  5. If working changes exist (or `prompt` supplied) → run working-changes pass
 *  6. Return combined result
 *
 * Both the execution backend (`runner`) and the storage backend (`store`) are
 * pluggable via `AnalyzeOptions`. Sensible defaults are used when omitted:
 * - `runner` → `SubprocessRunner` wrapping the first auto-detected harness
 * - `store`  → `MemoryStore` (no filesystem side-effects)
 */
export async function analyze(opts: AnalyzeOptions = {}): Promise<AnalyzeResult> {
  const cwd = opts.cwd ?? process.cwd()
  const store = opts.store ?? new MemoryStore()

  // 1. Git info
  const git = await getGitInfo(cwd)
  const projectKey = deriveProjectKey(git.repoRoot)
  const systemPromptHash = opts.systemPrompt ? hashSystemPrompt(opts.systemPrompt) : undefined

  // 2. Resolve runner — use provided runner or build a SubprocessRunner from harness detection
  const runner = opts.runner ?? (await resolveSubprocessRunner(opts.harness))

  // 3. Build cache key and check store
  const cacheKey: CacheKey = {
    projectKey,
    gitHash: git.hash,
    ...(systemPromptHash !== undefined ? { systemPromptHash } : {}),
  }

  let cachedEntry: AnalysisCache | null = null
  if (!opts.force) {
    const stored = await store.get(cacheKey)
    if (stored !== null && opts.maxAge !== undefined) {
      const ageMs = Date.now() - new Date(stored.createdAt).getTime()
      cachedEntry = ageMs <= opts.maxAge ? stored : null
    } else {
      cachedEntry = stored
    }
  }

  let baseAnalysis: string
  let fromCache: boolean

  if (cachedEntry) {
    // Cache hit
    baseAnalysis = cachedEntry.analysis
    fromCache = true
  } else {
    // Cache miss — run full base analysis
    const basePrompt = buildBaseAnalysisPrompt(opts.systemPrompt)
    const result = await runner.run({
      prompt: basePrompt,
      cwd: git.repoRoot,
      ...(opts.model !== undefined ? { model: opts.model } : {}),
      ...(opts.stream !== undefined ? { stream: opts.stream } : {}),
    })
    baseAnalysis = result.output

    const entry: AnalysisCache = {
      gitHash: git.hash,
      projectKey,
      createdAt: new Date().toISOString(),
      runner: runner.name,
      analysis: baseAnalysis,
      ...(opts.model !== undefined ? { model: opts.model } : {}),
      ...(systemPromptHash !== undefined ? { systemPromptHash } : {}),
    }
    await store.set(cacheKey, entry)
    fromCache = false
  }

  // 4. Working changes pass (never cached)
  let finalAnalysis = baseAnalysis
  if (git.hasWorkingChanges || opts.prompt) {
    const workingPrompt = buildWorkingChangesPrompt(baseAnalysis, opts.prompt)
    const result = await runner.run({
      prompt: workingPrompt,
      cwd: git.repoRoot,
      ...(opts.model !== undefined ? { model: opts.model } : {}),
      ...(opts.stream !== undefined ? { stream: opts.stream } : {}),
    })
    finalAnalysis = result.output
  }

  return {
    analysis: finalAnalysis,
    fromCache,
    gitHash: git.hash,
    projectKey,
    runner: runner.name,
  }
}
