import { defineCommand } from "citty"
import { promises as fs } from "fs"
import * as path from "path"
import { detectHarnesses } from "@research.actor/core"
import type { HarnessName } from "@research.actor/core"

// Check if colors should be disabled
const noColor = process.env.NO_COLOR !== undefined || process.env.TERM === "dumb"
const forceColor = process.env.FORCE_COLOR !== undefined
const useColor = forceColor || (!noColor && process.stdout.isTTY)

// ANSI color codes (empty if colors disabled)
const c = {
  reset: useColor ? "\x1b[0m" : "",
  bold: useColor ? "\x1b[1m" : "",
  dim: useColor ? "\x1b[2m" : "",
  red: useColor ? "\x1b[31m" : "",
  green: useColor ? "\x1b[32m" : "",
  yellow: useColor ? "\x1b[33m" : "",
  blue: useColor ? "\x1b[34m" : "",
  magenta: useColor ? "\x1b[35m" : "",
  cyan: useColor ? "\x1b[36m" : "",
  gray: useColor ? "\x1b[90m" : "",
}

// Unicode symbols (always used, they're not colors)
const s = {
  check: "\u2713",      // ✓
  cross: "\u2717",      // ✗
  arrow: "\u2192",      // →
  bullet: "\u2022",     // •
  info: "\u2139",       // ℹ
  star: "\u2605",       // ★
  folder: "\u25B8",     // ▸
  file: "\u25C6",       // ◆
  minus: "\u2212",      // −
  plus: "\u002B",       // +
}

const VALID_HARNESSES: readonly HarnessName[] = ["opencode", "claude", "codex", "aider", "gemini"]

const SKILL_NAME = "research.actor"
const SKILL_FILENAME = "SKILL.md"

// The skill content to install
const SKILL_CONTENT = `---
name: research-analyze
description: >
  Use research to get an instant, cached analysis of the current codebase instead of
  exploring the repository from scratch. Run \`research\` at the start of any session to
  understand the codebase structure, architecture, and current working changes. Significantly
  reduces token usage by caching analyses per git commit and only re-analyzing uncommitted diffs.
license: MIT
compatibility: Requires research to be installed (npm install -g research). Requires git.
metadata:
  author: research.actor
  version: "0.1"
allowed-tools: Bash(research:*)
---

# research — Cached Codebase Analysis

\`research\` is a CLI tool that gives you a cached, structured overview of the current codebase.
Use it at the start of a session or task instead of manually exploring files and directories.

## When to use this skill

- At the start of any coding session to orient yourself in the codebase
- When asked to understand the project structure, architecture, or conventions
- Before making changes to understand what exists and where
- When working with an unfamiliar codebase
- When you need to understand the impact of in-progress (uncommitted) changes

**Do not** spin up a sub-agent to explore the codebase if \`research\` is available.
Prefer \`research\` — it is faster, cheaper, and consistent.

## Basic usage

Run with no arguments for a full codebase analysis:

\`\`\`bash
research
\`\`\`

The first call on a new git commit runs a full analysis (takes 30–120 seconds depending on
codebase size). All subsequent calls on the same commit return the cached result instantly.

If there are uncommitted working changes, \`research\` automatically runs a lightweight
secondary pass that discovers and incorporates the diff on top of the cached analysis.

## Targeted queries with --prompt

Use \`--prompt\` to ask a specific question about the current state of the codebase.
This is passed only to the working-changes agent — never cached — and layered on top
of the cached base analysis:

\`\`\`bash
research --prompt "what does the authentication flow look like?"
research --prompt "which modules would be affected by changing the User model?"
research --prompt "summarize what the in-progress changes are doing"
\`\`\`

This is the **preferred** way to ask targeted questions. It gives the analysis agent both
the full cached codebase context and your specific question.

## Customizing the cached analysis with --system-prompt

Use \`--system-prompt\` to change what the *cached* analysis focuses on. Each distinct
system prompt produces a separate cache entry:

\`\`\`bash
research --system-prompt "focus on the API layer, data models, and database schema"
research --system-prompt "focus on the frontend component hierarchy and state management"
\`\`\`

Use this when you need a cached analysis oriented toward a specific domain of the codebase.
Unlike \`--prompt\`, this affects the full analysis that gets cached.

## Selecting a harness

\`research\` auto-detects installed coding harnesses. Override with \`--harness\`:

\`\`\`bash
research --harness claude
research --harness opencode
research --harness codex
\`\`\`

## Other useful flags

\`\`\`bash
research --model claude-opus-4-5     # specify model for the harness
research --force                      # bypass cache, re-run full analysis
research --json                       # output as JSON (for programmatic use)
research --list-harnesses             # show which harnesses are installed
\`\`\`

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

Use \`--json\` when consuming the output programmatically:

\`\`\`json
{
  "analysis": "...",
  "fromCache": true,
  "gitHash": "abc123",
  "projectKey": "my-app-3f2a1b4c",
  "harness": "claude"
}
\`\`\`

\`fromCache: true\` means the base analysis was served from cache. A working-changes pass
may still have run on top if uncommitted changes were detected.

## Cache location

Caches are stored in \`~/.cache/research/<project-key>/\` — outside the repository,
so agents will not accidentally read stale or incorrect analysis files.

Each cache file is named \`<git-hash>.json\` (or \`<git-hash>-<system-prompt-hash>.json\`
when a system prompt is used). Switching git commits automatically picks up the correct
cached analysis.
`

interface InstallTarget {
  harness: HarnessName
  paths: string[]
  description: string
}

function parseHarnessList(value: string): HarnessName[] {
  return value.split(",").map((h) => h.trim()).filter((h): h is HarnessName =>
    VALID_HARNESSES.includes(h as HarnessName)
  )
}

function getInstallTargets(harnesses: HarnessName[], isGlobal: boolean): InstallTarget[] {
  const targets: InstallTarget[] = []

  for (const harness of harnesses) {
    switch (harness) {
      case "claude":
        if (isGlobal) {
          targets.push({
            harness,
            paths: [path.join("~", ".claude", "CLAUDE.md")],
            description: "Global CLAUDE.md",
          })
        } else {
          targets.push({
            harness,
            paths: [path.join(".claude", "skills", SKILL_NAME, SKILL_FILENAME)],
            description: "Project skills directory",
          })
        }
        break

      case "opencode":
        if (isGlobal) {
          targets.push({
            harness,
            paths: [path.join("~", ".config", "opencode", "skills", SKILL_NAME, SKILL_FILENAME)],
            description: "Global opencode skills",
          })
        } else {
          targets.push({
            harness,
            paths: [path.join(".opencode", "skills", SKILL_NAME, SKILL_FILENAME)],
            description: "Project opencode skills",
          })
        }
        break

      case "codex":
        if (isGlobal) {
          targets.push({
            harness,
            paths: [path.join("~", ".codex", "agents", "skills", SKILL_NAME, SKILL_FILENAME)],
            description: "Global codex skills",
          })
        } else {
          targets.push({
            harness,
            paths: [path.join(".agents", "skills", SKILL_NAME, SKILL_FILENAME)],
            description: "Project agents skills",
          })
        }
        break

      case "aider":
        // Aider doesn't have a native skill system, but we can create a conventions file
        if (isGlobal) {
          targets.push({
            harness,
            paths: [path.join("~", ".aider", "conventions", "research.md")],
            description: "Global aider conventions",
          })
        } else {
          targets.push({
            harness,
            paths: [path.join("CONVENTIONS.md")],
            description: "Project CONVENTIONS.md (append research instructions)",
          })
        }
        break

      case "gemini":
        if (isGlobal) {
          targets.push({
            harness,
            paths: [
              path.join("~", ".gemini", "skills", SKILL_NAME, SKILL_FILENAME),
              path.join("~", ".agents", "skills", SKILL_NAME, SKILL_FILENAME),
            ],
            description: "Global gemini skills",
          })
        } else {
          targets.push({
            harness,
            paths: [
              path.join(".gemini", "skills", SKILL_NAME, SKILL_FILENAME),
              path.join(".agents", "skills", SKILL_NAME, SKILL_FILENAME),
            ],
            description: "Project gemini skills",
          })
        }
        break
    }
  }

  return targets
}

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (err) {
    // Directory might already exist
  }
}

async function expandHome(filepath: string): Promise<string> {
  if (filepath.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE || "/"
    return path.join(home, filepath.slice(2))
  }
  return filepath
}

async function installSkill(targetPath: string, isAppend: boolean = false): Promise<boolean> {
  try {
    const expandedPath = await expandHome(targetPath)
    const dir = path.dirname(expandedPath)
    await ensureDir(dir)

    if (isAppend) {
      let existing = ""
      try {
        existing = await fs.readFile(expandedPath, "utf-8")
      } catch {
        // File doesn't exist
      }
      
      if (!existing.includes("research.actor")) {
        const separator = existing ? "\n\n---\n\n" : ""
        await fs.writeFile(expandedPath, existing + separator + SKILL_CONTENT)
        console.log(`  ${c.green}+${c.reset} ${targetPath}`)
      } else {
        console.log(`  ${c.dim}=${c.reset} ${targetPath}`)
      }
    } else {
      try {
        await fs.access(expandedPath)
        console.log(`  ${c.dim}=${c.reset} ${targetPath}`)
        return true
      } catch {
        await fs.writeFile(expandedPath, SKILL_CONTENT)
        console.log(`  ${c.green}+${c.reset} ${targetPath}`)
      }
    }
    return true
  } catch (err) {
    console.error(`  ${c.red}!${c.reset} ${targetPath}`)
    return false
  }
}

async function uninstallSkill(targetPath: string, isAppend: boolean = false): Promise<boolean> {
  try {
    const expandedPath = await expandHome(targetPath)

    if (isAppend) {
      let existing = ""
      try {
        existing = await fs.readFile(expandedPath, "utf-8")
      } catch {
        return true
      }
      
      if (existing.includes("research.actor")) {
        const lines = existing.split("\n")
        const newLines: string[] = []
        let inResearchSection = false
        let researchStartIndex = -1
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!
          if (line.includes("---") && researchStartIndex === -1 && existing.substring(0, lines.slice(0, i + 1).join("\n").length).includes("research.actor")) {
            researchStartIndex = i
            inResearchSection = true
            continue
          }
          if (inResearchSection && line.includes("---") && i > researchStartIndex) {
            inResearchSection = false
            continue
          }
          if (!inResearchSection && !line.includes("research.actor")) {
            newLines.push(line)
          }
        }
        
        await fs.writeFile(expandedPath, newLines.join("\n").trim())
        console.log(`  ${c.red}-${c.reset} ${targetPath}`)
      } else {
        console.log(`  ${c.dim}=${c.reset} ${targetPath}`)
      }
    } else {
      try {
        await fs.access(expandedPath)
        await fs.unlink(expandedPath)
        console.log(`  ${c.red}-${c.reset} ${targetPath}`)
      } catch {
        console.log(`  ${c.dim}=${c.reset} ${targetPath}`)
      }
    }
    return true
  } catch (err) {
    console.error(`  ${c.red}!${c.reset} ${targetPath}`)
    return false
  }
}

export const skillCommand = defineCommand({
  meta: {
    name: "skill",
    description:
      "Print, install, or uninstall the research.agent skill. " +
      "By default, prints the SKILL.md content to stdout. " +
      "Use --install to write the skill to AI agent directories, or --uninstall to remove it.",
  },
  args: {
    install: {
      type: "boolean",
      description: "Install the skill to AI agent directories instead of printing to stdout.",
      alias: "i",
      default: false,
    },
    uninstall: {
      type: "boolean",
      description: "Remove the skill from AI agent directories.",
      alias: "u",
      default: false,
    },
    harness: {
      type: "string",
      description: `Comma-separated list of harnesses to install for. One or more of: ${VALID_HARNESSES.join(", ")}. ` +
        "Auto-detects installed harnesses if omitted (local install only). Required when using --global.",
      alias: "H",
    },
    global: {
      type: "boolean",
      description: "Install/uninstall globally (system-wide) instead of in the current repository. " +
        "Requires --harness to be specified explicitly when used with --install or --uninstall.",
      alias: "g",
      default: false,
    },
  },

  async run({ args }) {
    const isInstall = args.install === true
    const isUninstall = args.uninstall === true
    const isGlobal = args.global === true

    // Can't use both install and uninstall
    if (isInstall && isUninstall) {
      console.error(`${c.red}Error:${c.reset} Cannot use both --install and --uninstall.`)
      process.exit(1)
    }

    // Default behavior: just print the skill content to stdout
    if (!isInstall && !isUninstall) {
      console.log(SKILL_CONTENT)
      return
    }

    // Get harnesses list
    let harnesses: HarnessName[] = []

    // Validate harness argument
    if (args.harness !== undefined) {
      harnesses = parseHarnessList(args.harness)
      if (harnesses.length === 0) {
        console.error(`${c.red}Error: Invalid harness(es) "${args.harness}"${c.reset}`)
        console.error(`Must be: ${VALID_HARNESSES.join(", ")}`)
        process.exit(1)
      }
    } else if (isGlobal) {
      console.error(`${c.red}Error: --global requires --harness${c.reset}`)
      console.error(`Example: research skill --global --harness claude --install`)
      process.exit(1)
    }

    // Auto-detect harnesses for local install
    if (!isGlobal && harnesses.length === 0) {
      const detected = await detectHarnesses()
      if (detected.length === 0) {
        console.error(`${c.red}No harnesses detected.${c.reset}`)
        console.error(`Install: ${VALID_HARNESSES.join(", ")}`)
        process.exit(1)
      }
      harnesses = detected.map((h: { name: HarnessName }) => h.name)
    }

    const action = isUninstall ? "Uninstalling" : "Installing"
    const symbol = isUninstall ? c.red + "-" + c.reset : c.green + "+" + c.reset
    console.log(`${symbol} ${action} research.actor ${isGlobal ? "(global)" : ""}`)
    console.log()

    const targets = getInstallTargets(harnesses, isGlobal)
    let successCount = 0
    let totalCount = 0

    for (const target of targets) {
      for (const targetPath of target.paths) {
        totalCount++
        const isAppend = target.harness === "aider" && !isGlobal
        const success = isUninstall 
          ? await uninstallSkill(targetPath, isAppend)
          : await installSkill(targetPath, isAppend)
        if (success) successCount++
      }
    }

    console.log()
    if (successCount === totalCount) {
      console.log(`${c.green}${s.check}${c.reset} Done`)
    } else {
      console.log(`${c.yellow}${successCount}/${totalCount} completed${c.reset}`)
      process.exit(1)
    }
  },
})
