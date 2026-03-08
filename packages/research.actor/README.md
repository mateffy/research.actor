# research.actor

Cached codebase analysis for AI coding agents — stop re-exploring, start caching.

[![npm version](https://img.shields.io/npm/v/research.actor.svg)](https://www.npmjs.com/package/research.actor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why?

Every new agent session wastes tokens re-reading your codebase. With research.actor you run a full research agent once per git commit, cache its analysis, and return it instantly to other agents. Saves time and tokens. Used as a baseline for deeper research.

## Installation

```bash
npm install -g research.actor
```

## Quick Start

```bash
# Analyze current codebase (cached after first run)
research.actor

# Use with a specific AI harness
research.actor --harness claude

# Ask specific questions (not cached)
research.actor --prompt "explain the auth system"
```

## How It Works

1. **First run** on a git commit: Invokes your AI harness to explore and analyze the codebase
2. **Subsequent runs**: Returns cached analysis instantly
3. **Working changes**: Automatically discovered via git and merged with cached base
4. **Switch branches**: Correct cache entry loads automatically based on git hash

## Features

- ⚡ **Instant context** for AI agents after first analysis
- 🔄 **One analysis per commit** — cached and reused
- 🔍 **Organic diff analysis** via git tools
- 🤖 **Multiple harness support** (opencode, claude, codex, aider, gemini)
- 💾 **Pluggable cache stores** (filesystem, memory, or custom)
- 📦 **Full TypeScript SDK**
- ⏱️ **Cache expiry** with `maxAge` option
- 🛡️ **Outside repo cache** (stored in `~/.cache/research.actor/`)

## SDK Usage

```typescript
import { analyze, FsStore } from "research.actor"

const result = await analyze({
  prompt: "focus on the auth system",
  store: new FsStore(),
})

console.log(result.analysis)
console.log(result.fromCache) // true if base was cached
```

## Documentation

- [CLI Usage](https://github.com/mateffy/research.actor#cli-usage)
- [SDK Reference](https://github.com/mateffy/research.actor#sdk-usage)
- [Custom Runners](https://github.com/mateffy/research.actor#custom-runner-in-process-agent)
- [Custom Cache Stores](https://github.com/mateffy/research.actor#custom-cache-store)

## Website

Visit [https://research.actor](https://research.actor) for more information.

## License

MIT
