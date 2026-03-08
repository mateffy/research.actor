
<picture height="0">
  <source media="(min-width: 769px)" srcset="./docs/pixel.png" width="0" height="0">
  <img src="./docs/icon.webp" alt="research.actor Logo" width="150">
</picture>

<div>
    <h1>
        <picture>
            <source media="(max-width: 768px)" srcset="./docs/pixel.png" width="0" height="0">
            <img src="./docs/icon.webp" alt="research.actor Logo" width="225" align="left">
        </picture>
        research.actor
    </h1>
    <p>
      <strong>Every new agent session wastes tokens re-reading your codebase.</strong><br>
      With research.actor you run a full research agent once per git commit, cache its analysis, and return it instantly to other agents. Saves time and tokens. Used as a baseline for deeper research.<br /><br />
        <a href="https://research.actor" target="_blank">Website</a> |
        <a href="https://github.com/mateffy/research.actor#readme" target="_blank">Documentation</a>
    </p>
</div>



<br />
<br />

```bash
npm install -g research.actor
```

```bash
$ cd /path/to/your/codebase

$ research
```

```json
{
  "analysis": "Express API with 12 routes...",
  "fromCache": true,
  "gitHash": "abc123"
}
```

<div align="center">
    <h6>or with specific questions...</h6>
</div>

```bash
research --prompt "explain the auth flow"
```

---

## Contents

- [Why?](#why)
- [Installation](#installation)
- [How it works](#how-it-works)
- [CLI usage](#cli-usage)
- [SDK usage](#sdk-usage)
  - [Basic](#basic)
  - [Persistent cache with FsStore](#persistent-cache-with-fsstore)
  - [Custom cache store](#custom-cache-store)
  - [Custom runner (in-process agent)](#custom-runner-in-process-agent)
  - [Cache expiry with maxAge](#cache-expiry-with-maxage)
  - [Error handling](#error-handling)
- [API reference](#api-reference)
- [Package structure](#package-structure)
- [Agent skill](#agent-skill)

---

## Why?

Every new agent session wastes tokens re-exploring your entire codebase to understand it. `research` breaks this bottleneck:

```
first call on a commit  →  full analysis  →  cached to disk
subsequent calls        →  instant cache hit
with working changes    →  cache hit + fast diff pass on top
```

---

## Installation

### Global CLI (recommended)

```bash
npm install -g research
# or
bun add -g research
```

### SDK only

```bash
npm install @research-agent/core
# or
bun add @research-agent/core
```

### CLI only

```bash
npm install -g @research-agent/cli
# or
bun add -g @research-agent/cli
```

---

## How it works

1. **First run** on a git commit: Invokes your AI harness to explore and analyze the codebase
2. **Subsequent runs**: Returns cached analysis instantly
3. **Working changes**: Automatically discovered via git and merged with cached base
4. **Switch branches**: Correct cache entry loads automatically based on git hash

---

## CLI usage

```bash
# Basic — auto-detects installed harness, uses persistent cache
research

# Targeted question about the current working diff (never cached)
research --prompt "what auth changes are in progress?"

# Customize the analysis focus — stored as a separate cache entry
research --system-prompt "focus on the API layer and data models"

# Specify harness and model
research --harness claude --model claude-opus-4

# Force a fresh analysis even if a cache entry exists
research --force

# Only use cached entry if younger than a given duration
research --max-age 2h
research --max-age 30m
research --max-age 7d

# JSON output — useful when consuming from another script or agent tool
research --json

# List harnesses detected on this system
research --list-harnesses

# Remove all cached analyses for the current repository
research clear
```

`research analyze [flags]` is an explicit alias for the default bare invocation.

### Flags

| Flag | Short | Description |
|---|---|---|
| `--harness <name>` | `-H` | Harness to use. One of: `opencode`, `claude`, `codex`, `aider`, `gemini`. Auto-detected if omitted. |
| `--model <name>` | `-m` | Model to pass to the harness (e.g. `claude-opus-4`, `gpt-4o`). |
| `--system-prompt <text>` | `-s` | Appended to the base analysis prompt. Different values produce separate cache entries. |
| `--prompt <text>` | `-p` | Passed only to the working-changes agent. Never cached. |
| `--force` | `-f` | Bypass cache and re-run the full analysis. |
| `--max-age <duration>` | `-a` | Maximum cache age. Accepts `ms`, `s`, `m`, `h`, `d` — e.g. `30m`, `2h`, `7d`. |
| `--json` | `-j` | Emit a JSON object instead of plain text. |
| `--list-harnesses` | `-l` | Print detected harnesses and exit. |

### Supported harnesses

| Name | Binary |
|---|---|
| OpenCode | `opencode` |
| Claude Code | `claude` |
| OpenAI Codex | `codex` |
| Aider | `aider` |
| Gemini CLI | `gemini` |

### Cache location

The CLI stores cache files in `~/.cache/research/<project-key>/` — outside the repository,
so agents do not accidentally read them. The `XDG_CACHE_HOME` environment variable is respected.

---

## SDK usage

`research` exports the full SDK. Everything is available from the top-level import.

### Basic

The simplest case. Uses a fresh `MemoryStore` (no disk I/O) and auto-detects the first
available harness.

```ts
import { analyze } from "research.actor"

const result = await analyze()

console.log(result.analysis)   // the full codebase analysis text
console.log(result.fromCache)  // true if served from cache
console.log(result.gitHash)    // the commit the analysis is keyed to
console.log(result.runner)     // name of the runner that produced it
```

With a focused prompt layered on top:

```ts
const result = await analyze({
  prompt: "what does the authentication flow look like?",
})
```

### Persistent cache with FsStore

The `MemoryStore` default does not survive across process restarts. For persistent caching
— the same behaviour as the CLI — pass an `FsStore`:

```ts
import { analyze, FsStore } from "research.actor"

const result = await analyze({
  store: new FsStore(),
})
```

`FsStore` defaults to `~/.cache/research/`. Pass a custom directory if needed:

```ts
const store = new FsStore("/var/cache/myapp/research")
const result = await analyze({ store })
```

For long-lived processes (e.g. a server), create the store once and reuse it across calls
so repeated calls within the same process also benefit from the in-memory lookup before
touching disk:

```ts
const store = new FsStore()

// first call — may hit disk or run the harness
await analyze({ store })

// second call in same process — hits the in-memory layer first
await analyze({ store })
```

### Custom cache store

Implement `CacheStore` to persist analyses anywhere — a database, Redis, S3, etc.

```ts
import { analyze } from "research.actor"
import type { CacheStore, CacheKey, AnalysisCache } from "research.actor"

class PostgresStore implements CacheStore {
  async get(key: CacheKey): Promise<AnalysisCache | null> {
    const row = await db.query(
      "SELECT data FROM analyses WHERE project=$1 AND hash=$2 AND prompt_hash=$3",
      [key.projectKey, key.gitHash, key.systemPromptHash ?? null],
    )
    return row ?? null
  }

  async set(key: CacheKey, entry: AnalysisCache): Promise<void> {
    await db.query(
      "INSERT INTO analyses (project, hash, prompt_hash, data) VALUES ($1,$2,$3,$4) ON CONFLICT DO UPDATE SET data=$4",
      [key.projectKey, key.gitHash, key.systemPromptHash ?? null, entry],
    )
  }

  async delete(key: CacheKey): Promise<void> {
    await db.query(
      "DELETE FROM analyses WHERE project=$1 AND hash=$2 AND prompt_hash=$3",
      [key.projectKey, key.gitHash, key.systemPromptHash ?? null],
    )
  }
}

const result = await analyze({ store: new PostgresStore() })
```

### Custom runner (in-process agent)

By default `research` spawns a subprocess harness. Implement `HarnessRunner` to use any
agent instead — an in-process library, a remote API call, a local model, or a test mock.

```ts
import { analyze } from "research.actor"
import type { HarnessRunner, RunRequest, RunResult } from "research.actor"

// Example: in-process agent (e.g. pi, or your own)
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

When `runner` is provided, `harness` auto-detection is skipped entirely. The `model` option
is still forwarded to the runner via `RunRequest.model` if you want to use it.

For testing, a mock runner removes all I/O:

```ts
class MockRunner implements HarnessRunner {
  readonly name = "mock"
  async run(_req: RunRequest): Promise<RunResult> {
    return { output: "src/ contains the main app. index.ts is the entry point." }
  }
}

const result = await analyze({ runner: new MockRunner() })
// result.fromCache === false, result.runner === "mock"
```

You can also wrap the built-in `SubprocessRunner` to intercept or modify behaviour:

```ts
import { SubprocessRunner, resolveHarness } from "research.actor"
import type { HarnessRunner, RunRequest, RunResult } from "research.actor"

class LoggingRunner implements HarnessRunner {
  private readonly inner: SubprocessRunner

  constructor(inner: SubprocessRunner) {
    this.inner = inner
  }

  get name() { return this.inner.name }

  async run(req: RunRequest): Promise<RunResult> {
    console.log(`[research] running ${this.name} in ${req.cwd}`)
    const result = await this.inner.run(req)
    console.log(`[research] got ${result.output.length} chars`)
    return result
  }
}

const harness = await resolveHarness("claude")
const runner = new LoggingRunner(new SubprocessRunner(harness))
await analyze({ runner, store: new FsStore() })
```

### Cache expiry with maxAge

Pass `maxAge` in milliseconds to treat entries older than that as stale:

```ts
import { analyze, FsStore } from "research.actor"

// Re-run if cached analysis is older than 24 hours
await analyze({
  store: new FsStore(),
  maxAge: 24 * 60 * 60 * 1000,
})

// Re-run if older than 30 minutes
await analyze({
  store: new FsStore(),
  maxAge: 30 * 60 * 1000,
})
```

A stale entry is treated as a cache miss. The new result overwrites the old one in the store.
When `maxAge` is omitted, entries never expire (only `force: true` bypasses them).

### Error handling

All research errors extend `CachelyzError`:

```ts
import { analyze, FsStore, CachelyzError, HarnessNotFoundError, GitError } from "research.actor"

try {
  await analyze({ store: new FsStore() })
} catch (err) {
  if (err instanceof HarnessNotFoundError) {
    // No supported harness binary found in PATH
    console.error("Install a harness: opencode, claude, codex, aider, or gemini")
  } else if (err instanceof GitError) {
    // Not a git repo, or git is not installed
    console.error("research must be run inside a git repository")
  } else if (err instanceof CachelyzError) {
    // Any other research error
    console.error(err.message, err.cause)
  } else {
    throw err
  }
}
```

---

## API reference

### `analyze(opts?): Promise<AnalyzeResult>`

The main entry point. All options are optional.

```ts
interface AnalyzeOptions {
  harness?:      HarnessName      // subprocess harness to use (auto-detected if omitted)
  model?:        string           // model name forwarded to the runner
  systemPrompt?: string           // appended to the cached analysis prompt
  prompt?:       string           // passed only to the working-changes agent, never cached
  cwd?:          string           // working directory (defaults to process.cwd())
  force?:        boolean          // bypass cache entirely
  maxAge?:       number           // ms — treat cache entries older than this as stale
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

Filesystem-backed `CacheStore`. Stores entries as JSON under `~/.cache/research/`.

```ts
new FsStore(baseDir?: string)
```

### `class MemoryStore`

In-memory `CacheStore`. Default when no `store` is passed to `analyze()`.
Entries do not survive process restarts.

```ts
const store = new MemoryStore()
store.size   // number of entries currently held
store.clear() // remove all entries
```

### `class SubprocessRunner`

Default `HarnessRunner`. Spawns a harness binary as a child process and streams stdout.

```ts
import { SubprocessRunner, resolveHarness } from "research.actor"

const harness = await resolveHarness("claude")
const runner = new SubprocessRunner(harness)
```

### `FsStore.clearProject(projectKey): Promise<number>`

Remove all cached entries for a project. Returns the number of files deleted.

```ts
import { FsStore, deriveProjectKey, getRepoRoot } from "research.actor"

const repoRoot = await getRepoRoot(process.cwd())
const projectKey = deriveProjectKey(repoRoot)
const store = new FsStore()
const deleted = await store.clearProject(projectKey)
console.log(`Deleted ${deleted} cache entries`)
```

### `resolveHarness(name?): Promise<ResolvedHarness>`

Resolve a harness binary path. Picks the first installed harness when `name` is omitted.
Throws `HarnessNotFoundError` if nothing is found.

### `detectHarnesses(): Promise<ResolvedHarness[]>`

Return all harnesses found in `PATH`.

### `getGitInfo(cwd): Promise<GitInfo>`

Return the current commit hash, repo root, and whether there are uncommitted changes.

### Interfaces

```ts
interface HarnessRunner {
  name: string
  run(req: RunRequest): Promise<RunResult>
}

interface RunRequest {
  prompt: string
  cwd:    string
  model?: string
}

interface RunResult {
  output: string
}

interface CacheStore {
  get(key: CacheKey):                       Promise<AnalysisCache | null>
  set(key: CacheKey, entry: AnalysisCache): Promise<void>
  delete(key: CacheKey):                    Promise<void>
}

interface CacheKey {
  projectKey:       string
  gitHash:          string
  systemPromptHash?: string
}
```

---

## Package structure

| Package | Description |
|---|---|
| `research` | Full package — SDK + CLI. Start here. |
| `@research-agent/core` | SDK only. No CLI dependency. |
| `@research-agent/cli` | CLI only. Depends on `@research-agent/core`. |
| `@research-agent/skill` | [Agent skill](https://agentskills.io) for teaching agents to use research. |

---

## Agent skill

A "skill" is a teaching resource for AI agents. When an AI agent has access to this skill, it can more effectively use research to analyze codebases.

### Installation

```bash
npm install @research-agent/skill
# or
bun add @research-agent/skill
```

### What's in the skill?

- **Usage patterns** — When and how to use research effectively
- **Integration guides** — Working with different harnesses (Claude, OpenCode, Codex, etc.)
- **Best practices** — Common pitfalls and how to avoid them
- **Troubleshooting** — Common issues and solutions

### For AI Agents

Once this package is installed, AI agents can reference the skill:

```
Use the research skill to analyze this codebase.
```

---

## Features

- ⚡ **Instant context** for AI agents after first analysis
- 🔄 **One analysis per commit** — cached and reused
- 🔍 **Organic diff analysis** via git tools
- 🤖 **Multiple harness support** (opencode, claude, codex, aider, gemini)
- 💾 **Pluggable cache stores** (filesystem, memory, or custom)
- 📦 **Full TypeScript SDK**
- ⏱️ **Cache expiry** with `maxAge` option
- 🛡️ **Outside repo cache** (stored in `~/.cache/research/`)

---

## License

MIT
