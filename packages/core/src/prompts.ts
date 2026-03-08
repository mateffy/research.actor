/**
 * The base prompt sent to the harness for producing the cached analysis.
 * The harness runs in the repo directory and has access to all its tools
 * (file reading, search, etc.) to organically explore the codebase.
 */
export function buildBaseAnalysisPrompt(systemPrompt?: string): string {
  const base = `\
You are performing a one-time codebase analysis that will be cached and reused by future AI agents.
Your job is to produce a comprehensive, dense developer overview of this codebase.

Explore the codebase thoroughly using your available tools. Do NOT ask questions or wait for input.

Your analysis MUST cover:
- High-level architecture and project purpose
- Directory and module structure with responsibilities for each key area
- Core abstractions, data models, and interfaces
- Primary data flows and control flows
- Technology stack, frameworks, and notable dependencies
- Entry points, main executables, and important configuration files
- Key design patterns and conventions used throughout
- Any non-obvious gotchas, constraints, or important context a new developer needs

Write as dense, information-rich prose and structured lists. This output will be consumed by
another LLM as context — optimize for completeness and signal density, not readability.

Output ONLY the analysis text. No preamble, no "here is my analysis", no closing remarks.`

  if (!systemPrompt) return base
  return `${base}\n\nAdditional analysis focus:\n${systemPrompt}`
}

/**
 * The prompt sent to the harness for analyzing working (uncommitted) changes.
 * The harness runs in the repo directory and discovers the diff organically
 * via its own git tools — we do not pass the diff directly.
 */
export function buildWorkingChangesPrompt(cachedAnalysis: string, userPrompt?: string): string {
  const base = `\
You are analyzing uncommitted working changes in a codebase. A cached analysis of the committed
codebase is provided below as context.

CACHED CODEBASE ANALYSIS:
---
${cachedAnalysis}
---

Using your available tools, discover the current uncommitted changes in this repository
(e.g. via \`git diff HEAD\`, \`git status\`, or similar). Explore any changed files as needed.

Then produce a concise update that describes:
- What has changed compared to the committed state
- Which parts of the codebase are affected and how
- The current overall state of the project incorporating these changes
- Any notable implications or risks from the in-progress changes

Output ONLY the updated analysis. No preamble, no closing remarks.`

  if (!userPrompt) return base
  return `${base}\n\nAdditional focus for this analysis:\n${userPrompt}`
}
