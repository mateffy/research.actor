# research.actor

An alias package for [cachelyze](https://github.com/mateffy/cachelyze) — cached codebase analysis for AI coding agents.

## Installation

```bash
npm install -g research.actor
```

## Usage

### CLI

```bash
# Analyze current codebase
research.actor

# Use specific harness
research.actor --harness claude

# Ask specific questions
research.actor --prompt "explain the auth system"
```

### SDK

```typescript
import { analyze } from "research.actor"

const result = await analyze({ prompt: "focus on the auth system" })
console.log(result.analysis)
```

## Documentation

See the [main cachelyze repository](https://github.com/mateffy/cachelyze) for full documentation.

## License

MIT
