# @cachelyze/cli

> **Alpha — work in progress.** CLI interface may change without notice.

Command-line interface for cachelyze — cached codebase analysis for AI coding agents.

This package provides the CLI for cachelyze. For programmatic SDK access, use [`@cachelyze/core`](https://www.npmjs.com/package/@cachelyze/core). For the full package with both CLI and SDK, see [`cachelyze`](https://www.npmjs.com/package/cachelyze).

**Website:** [research.actor](https://research.actor)  
**Repository:** [github.com/mateffy/research.actor](https://github.com/mateffy/research.actor)

---

## Installation

### Global (recommended)

```sh
npm install -g @cachelyze/cli
# or
bun add -g @cachelyze/cli
```

### Local

```sh
npm install @cachelyze/cli
# or
bun add @cachelyze/cli
```

---

## Quick Start

```sh
# Basic — auto-detects installed harness, uses persistent cache
cachelyze

# Targeted question about current working diff (never cached)
cachelyze --prompt "what auth changes are in progress?"

# Customize the analysis focus — stored as separate cache entry
cachelyze --system-prompt "focus on the API layer and data models"
```

---

## Usage

### Commands

```sh
# Analyze (default)
cachelyze
cachelyze analyze

# Clear all cached analyses for current repository
cachelyze clear
```

### Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--harness <name>` | `-H` | Harness: `opencode`, `claude`, `codex`, `aider`, `gemini` (auto-detected if omitted) |
| `--model <name>` | `-m` | Model to pass to harness |
| `--system-prompt <text>` | `-s` | Appended to base analysis prompt |
| `--prompt <text>` | `-p` | Passed to working-changes agent (never cached) |
| `--force` | `-f` | Bypass cache and re-run full analysis |
| `--max-age <duration>` | `-a` | Max cache age: `30m`, `2h`, `7d` |
| `--json` | `-j` | Emit JSON output |
| `--list-harnesses` | `-l` | Print detected harnesses |

### Examples

```sh
# Specify harness and model
cachelyze --harness claude --model claude-opus-4-5

# Force fresh analysis
cachelyze --force

# Only use cache if younger than 2 hours
cachelyze --max-age 2h

# JSON output for scripting
cachelyze --json

# List available harnesses
cachelyze --list-harnesses

# Clear cache for this project
cachelyze clear
```

---

## Supported Harnesses

| Name | Binary |
|------|--------|
| OpenCode | `opencode` |
| Claude Code | `claude` |
| OpenAI Codex | `codex` |
| Aider | `aider` |
| Gemini CLI | `gemini` |

---

## Cache Location

Cache files are stored in `~/.cache/cachelyze/<project-key>/` — outside the repository so agents don't accidentally read them. Respects `XDG_CACHE_HOME`.

---

## Full Documentation

For SDK usage, programmatic API, and advanced examples, see the [main README](https://github.com/mateffy/research.actor#readme).

---

## Package Structure

| Package | Description |
|---------|-------------|
| `cachelyze` | Full package — SDK + CLI |
| `@cachelyze/core` | SDK only |
| `@cachelyze/cli` | **CLI only** (this package) |
| `@cachelyze/skill` | Agent skill for teaching agents to use cachelyze |

---

## License

MIT
