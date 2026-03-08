# @cachelyze/core

> **Alpha — work in progress.** APIs may change without notice.

Core SDK for cachelyze — cached codebase analysis for AI coding agents.

This package contains the core business logic and SDK for programmatic use. For the full package with CLI included, see [`cachelyze`](https://www.npmjs.com/package/cachelyze).

**Website:** [research.actor](https://research.actor)  
**Repository:** [github.com/mateffy/research.actor](https://github.com/mateffy/research.actor)

---

## Installation

```sh
npm install @cachelyze/core
# or
bun add @cachelyze/core
```

---

## Quick Start

```ts
import { analyze, FsStore } from "@cachelyze/core"

// Basic analysis with persistent cache
const result = await analyze({
  store: new FsStore(),
})

console.log(result.analysis)   // the full codebase analysis text
console.log(result.fromCache)  // true if served from cache
console.log(result.gitHash)    // the commit the analysis is keyed to
```

---

## Usage Examples

### Basic with Memory Store

```ts
import { analyze } from "@cachelyze/core"

const result = await analyze()
console.log(result.analysis)
```

### Persistent Cache with FsStore

```ts
import { analyze, FsStore } from "@cachelyze/core"

const store = new FsStore()

// First call — may run the harness
await analyze({ store })

// Second call — instant cache hit
await analyze({ store })
```

### With Focused Prompt

```ts
const result = await analyze({
  store: new FsStore(),
  prompt: "what does the authentication flow look like?",
})
```

### Cache Expiry

```ts
// Re-run if cached analysis is older than 24 hours
await analyze({
  store: new FsStore(),
  maxAge: 24 * 60 * 60 * 1000,
})
```

### Custom Cache Store

```ts
import type { CacheStore, CacheKey, AnalysisCache } from "@cachelyze/core"

class PostgresStore implements CacheStore {
  async get(key: CacheKey): Promise<AnalysisCache | null> {
    // Implementation
  }

  async set(key: CacheKey, entry: AnalysisCache): Promise<void> {
    // Implementation
  }

  async delete(key: CacheKey): Promise<void> {
    // Implementation
  }
}

const result = await analyze({ store: new PostgresStore() })
```

### Custom Runner (In-Process Agent)

```ts
import type { HarnessRunner, RunRequest, RunResult } from "@cachelyze/core"

class MyAgentRunner implements HarnessRunner {
  readonly name = "my-agent"

  async run(req: RunRequest): Promise<RunResult> {
    const output = await myAgent.query(req.prompt, {
      workingDir: req.cwd,
      model: req.model,
    })
    return { output }
  }
}

const result = await analyze({
  runner: new MyAgentRunner(),
  store: new FsStore(),
})
```

---

## API Reference

### `analyze(opts?): Promise<AnalyzeResult>`

Main entry point for running cached analysis.

```ts
interface AnalyzeOptions {
  harness?:      HarnessName      // subprocess harness (auto-detected if omitted)
  model?:        string           // model name forwarded to runner
  systemPrompt?: string           // appended to cached analysis prompt
  prompt?:       string           // passed to working-changes agent (never cached)
  cwd?:          string           // working directory (defaults to process.cwd())
  force?:        boolean          // bypass cache entirely
  maxAge?:       number           // ms — treat entries older than this as stale
  store?:        CacheStore       // storage backend (defaults to MemoryStore)
  runner?:       HarnessRunner    // execution backend (defaults to SubprocessRunner)
}

interface AnalyzeResult {
  analysis:   string   // full analysis text
  fromCache:  boolean  // true if base analysis was served from cache
  gitHash:    string   // commit hash the analysis is keyed to
  projectKey: string   // stable repo identifier used in cache keys
  runner:     string   // name of the runner that produced the base analysis
}
```

### `class FsStore`

Filesystem-backed cache store. Stores entries as JSON under `~/.cache/cachelyze/`.

```ts
new FsStore(baseDir?: string)
```

### `class MemoryStore`

In-memory cache store. Default when no store is passed. Entries do not survive process restarts.

```ts
const store = new MemoryStore()
store.size    // number of entries currently held
store.clear() // remove all entries
```

### Error Handling

All errors extend `CachelyzError`:

```ts
import { CachelyzError, HarnessNotFoundError, GitError } from "@cachelyze/core"

try {
  await analyze({ store: new FsStore() })
} catch (err) {
  if (err instanceof HarnessNotFoundError) {
    console.error("Install a harness: opencode, claude, codex, aider, or gemini")
  } else if (err instanceof GitError) {
    console.error("Must be run inside a git repository")
  }
}
```

---

## Full Documentation

For complete documentation including CLI usage, all configuration options, and advanced examples, see the [main README](https://github.com/mateffy/research.actor#readme).

---

## Package Structure

| Package | Description |
|---------|-------------|
| `cachelyze` | Full package — SDK + CLI |
| `@cachelyze/core` | **SDK only** (this package) |
| `@cachelyze/cli` | CLI only |
| `@cachelyze/skill` | Agent skill for teaching agents to use cachelyze |

---

## License

MIT
