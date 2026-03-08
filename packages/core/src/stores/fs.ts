import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile, unlink, rm, readdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { AnalysisCache, CacheKey, CacheStore } from "../types.js"

/** XDG-compatible base cache directory */
function defaultCacheBaseDir(): string {
  const xdg = process.env["XDG_CACHE_HOME"]
  if (xdg) return join(xdg, "cachelyze")
  return join(homedir(), ".cache", "cachelyze")
}

function keyToFilename(key: CacheKey): string {
  if (!key.systemPromptHash) return `${key.gitHash}.json`
  return `${key.gitHash}-${key.systemPromptHash}.json`
}

/**
 * Filesystem-backed cache store.
 *
 * Stores analysis entries as JSON files under:
 * `<baseDir>/<projectKey>/<gitHash>[-<systemPromptHash>].json`
 *
 * The base directory defaults to `~/.cache/cachelyze` (XDG-aware).
 * Pass a custom `baseDir` to override, e.g. for testing.
 *
 * @example Default usage (CLI)
 * ```ts
 * const store = new FsStore()
 * ```
 *
 * @example Custom directory
 * ```ts
 * const store = new FsStore("/tmp/my-cache")
 * ```
 */
export class FsStore implements CacheStore {
  readonly baseDir: string

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? defaultCacheBaseDir()
  }

  private filePath(key: CacheKey): string {
    return join(this.baseDir, key.projectKey, keyToFilename(key))
  }

  async get(key: CacheKey): Promise<AnalysisCache | null> {
    const filePath = this.filePath(key)
    if (!existsSync(filePath)) return null
    try {
      const raw = await readFile(filePath, "utf8")
      return JSON.parse(raw) as AnalysisCache
    } catch {
      return null
    }
  }

  async set(key: CacheKey, entry: AnalysisCache): Promise<void> {
    const dir = join(this.baseDir, key.projectKey)
    await mkdir(dir, { recursive: true })
    await writeFile(this.filePath(key), JSON.stringify(entry, null, 2), "utf8")
  }

  async delete(key: CacheKey): Promise<void> {
    const filePath = this.filePath(key)
    if (!existsSync(filePath)) return
    await unlink(filePath)
  }

  /**
   * Remove all cached entries for a given project key.
   * Deletes the entire `<baseDir>/<projectKey>/` directory.
   *
   * Returns the number of files deleted, or `0` if the directory did not exist.
   */
  async clearProject(projectKey: string): Promise<number> {
    const dir = join(this.baseDir, projectKey)
    if (!existsSync(dir)) return 0
    const files = await readdir(dir)
    await rm(dir, { recursive: true, force: true })
    return files.length
  }
}

/**
 * Derive the system-prompt hash component used in cache keys.
 * Exposed so callers can build a `CacheKey` without importing crypto directly.
 */
export function hashSystemPrompt(systemPrompt: string): string {
  return createHash("sha256").update(systemPrompt).digest("hex").slice(0, 12)
}
