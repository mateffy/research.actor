import type { AnalysisCache, CacheKey, CacheStore } from "../types.js"

function toMapKey(key: CacheKey): string {
  return [key.projectKey, key.gitHash, key.systemPromptHash ?? ""].join("::")
}

/**
 * In-memory cache store.
 *
 * Entries live only for the lifetime of the `MemoryStore` instance.
 * This is the default store used by the SDK (`analyze()`) when no
 * `store` option is provided — it imposes zero I/O side-effects, making
 * it safe to use in library contexts and tests.
 *
 * For persistence across process restarts, use `FsStore` or a custom store.
 *
 * @example
 * ```ts
 * // Share one store across multiple analyze() calls in a long-lived process
 * const store = new MemoryStore()
 * await analyze({ store })
 * await analyze({ store }) // second call hits the in-memory cache
 * ```
 */
export class MemoryStore implements CacheStore {
  private readonly entries = new Map<string, AnalysisCache>()

  async get(key: CacheKey): Promise<AnalysisCache | null> {
    return this.entries.get(toMapKey(key)) ?? null
  }

  async set(key: CacheKey, entry: AnalysisCache): Promise<void> {
    this.entries.set(toMapKey(key), entry)
  }

  async delete(key: CacheKey): Promise<void> {
    this.entries.delete(toMapKey(key))
  }

  /** Number of entries currently held in memory. Useful for testing/debugging. */
  get size(): number {
    return this.entries.size
  }

  /** Remove all entries. */
  clear(): void {
    this.entries.clear()
  }
}
