# @cachelyze/skill

> **Alpha — work in progress.**

Agent skill for research.actor — teaches AI agents how to use research.actor effectively.

This package provides a [Agent Skill](https://agentskills.io) that helps AI coding agents understand and use research.actor. It includes best practices, usage patterns, and integration guides.

**Website:** [research.actor](https://research.actor)  
**Repository:** [github.com/mateffy/research.actor](https://github.com/mateffy/research.actor)

---

## Installation

```sh
npm install @cachelyze/skill
# or
bun add @cachelyze/skill
```

---

## What's a Skill?

A "skill" is a teaching resource for AI agents. It provides:

- Usage patterns and best practices
- Integration examples  
- Common pitfalls and how to avoid them
- Configuration recommendations

When an AI agent has access to this skill, it can more effectively use research.actor to analyze codebases.

---

## Usage

### For AI Agents

Once this package is installed in your project, AI agents can reference the skill:

```
Use the research.actor skill to analyze this codebase.
```

The skill will guide the agent on:
- When to run research.actor
- How to interpret results
- Best practices for cached analysis
- Integration with different harnesses (Claude, OpenCode, Codex, etc.)

### For Developers

Install this skill package alongside research.actor:

```sh
npm install research.actor @cachelyze/skill
```

The skill is automatically available to compatible agents.

---

## Skill Contents

The skill includes:

- **Usage patterns** — When and how to use research.actor effectively
- **CLI reference** — Quick reference for common commands
- **SDK patterns** — How to use the SDK programmatically
- **Integration guides** — Working with different AI harnesses
- **Troubleshooting** — Common issues and solutions

---

## Full Documentation

For complete documentation, see the [main README](https://github.com/mateffy/research.actor#readme).

---

## Package Structure

| Package | Description |
|---------|-------------|
| `research.actor` | Full package — SDK + CLI |
| `@cachelyze/core` | SDK only |
| `@cachelyze/cli` | CLI only |
| `@cachelyze/skill` | **Agent skill** (this package) |

---

## License

MIT
