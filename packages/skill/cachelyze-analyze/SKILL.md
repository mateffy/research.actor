---
name: cachelyze-analyze
description: >
  Use cachelyze to get an instant, cached analysis of the current codebase instead of
  exploring the repository from scratch. Run `cachelyze` at the start of any session to
  understand the codebase structure, architecture, and current working changes. Significantly
  reduces token usage by caching analyses per git commit and only re-analyzing uncommitted diffs.
license: MIT
compatibility: Requires cachelyze to be installed (npm install -g cachelyze). Requires git.
metadata:
  author: cachelyze
  version: "0.1"
allowed-tools: Bash(cachelyze:*)
---

# cachelyze — Cached Codebase Analysis

`cachelyze` is a CLI tool that gives you a cached, structured overview of the current codebase.
Use it at the start of a session or task instead of manually exploring files and directories.

## When to use this skill

- At the start of any coding session to orient yourself in the codebase
- When asked to understand the project structure, architecture, or conventions
- Before making changes to understand what exists and where
- When working with an unfamiliar codebase
- When you need to understand the impact of in-progress (uncommitted) changes

**Do not** spin up a sub-agent to explore the codebase if `cachelyze` is available.
Prefer `cachelyze` — it is faster, cheaper, and consistent.

## Basic usage

Run with no arguments for a full codebase analysis:

```bash
cachelyze
```

The first call on a new git commit runs a full analysis (takes 30–120 seconds depending on
codebase size). All subsequent calls on the same commit return the cached result instantly.

If there are uncommitted working changes, `cachelyze` automatically runs a lightweight
secondary pass that discovers and incorporates the diff on top of the cached analysis.

## Targeted queries with --prompt

Use `--prompt` to ask a specific question about the current state of the codebase.
This is passed only to the working-changes agent — never cached — and layered on top
of the cached base analysis:

```bash
cachelyze --prompt "what does the authentication flow look like?"
cachelyze --prompt "which modules would be affected by changing the User model?"
cachelyze --prompt "summarize what the in-progress changes are doing"
```

This is the **preferred** way to ask targeted questions. It gives the analysis agent both
the full cached codebase context and your specific question.

## Customizing the cached analysis with --system-prompt

Use `--system-prompt` to change what the *cached* analysis focuses on. Each distinct
system prompt produces a separate cache entry:

```bash
cachelyze --system-prompt "focus on the API layer, data models, and database schema"
cachelyze --system-prompt "focus on the frontend component hierarchy and state management"
```

Use this when you need a cached analysis oriented toward a specific domain of the codebase.
Unlike `--prompt`, this affects the full analysis that gets cached.

## Selecting a harness

`cachelyze` auto-detects installed coding harnesses. Override with `--harness`:

```bash
cachelyze --harness claude
cachelyze --harness opencode
cachelyze --harness codex
```

See [references/harnesses.md](references/harnesses.md) for the full list of supported harnesses.

## Other useful flags

```bash
cachelyze --model claude-opus-4-5     # specify model for the harness
cachelyze --force                      # bypass cache, re-run full analysis
cachelyze --json                       # output as JSON (for programmatic use)
cachelyze --list-harnesses             # show which harnesses are installed
```

## Understanding the output

The output is a dense, information-rich analysis optimized for LLM consumption. It covers:

- High-level architecture and project purpose
- Module structure and responsibilities
- Core abstractions and data models
- Data and control flows
- Technology stack and dependencies
- Entry points and configuration
- Design patterns and conventions

When working changes are present, the output also describes what has changed and how it
affects the codebase.

## JSON output format

Use `--json` when consuming the output programmatically:

```json
{
  "analysis": "...",
  "fromCache": true,
  "gitHash": "abc123",
  "projectKey": "my-app-3f2a1b4c",
  "harness": "claude"
}
```

`fromCache: true` means the base analysis was served from cache. A working-changes pass
may still have run on top if uncommitted changes were detected.

## Cache location

Caches are stored in `~/.cache/cachelyze/<project-key>/` — outside the repository,
so agents will not accidentally read stale or incorrect analysis files.

Each cache file is named `<git-hash>.json` (or `<git-hash>-<system-prompt-hash>.json`
when a system prompt is used). Switching git commits automatically picks up the correct
cached analysis.
