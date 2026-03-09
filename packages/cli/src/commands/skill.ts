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
  Use research.actor to get codebase context instead of exploring manually or spawning sub-agents.
  
  For GENERAL codebase overview: Run \`research analyze\` (cached analysis, returns instantly on subsequent calls).
  
  For SPECIFIC QUESTIONS: Run \`research ask "your question"\` (uses cached context if available, 
  otherwise analyzes on-demand. Focuses on answering your question directly).
  
  IMPORTANT: If RESEARCH_ACTIVE environment variable is set, you are already running inside a
  research subprocess. DO NOT invoke research again — analyze the codebase directly instead.
license: MIT
compatibility: Requires research to be installed (npm install -g research). Requires git.
metadata:
  author: research.actor
  version: "0.1"
  disable-invocation-when: "process.env.RESEARCH_ACTIVE === 'true'"
allowed-tools: Bash(research:*)
---

# research.actor — Smart Codebase Context

Use research.actor instead of manually exploring or spawning sub-agents to understand the codebase.

## Which command to use?

### Use \`research ask "question"\` for specific questions (RECOMMENDED)

When you need to answer a specific question about the codebase:

\`\`\`bash
research ask "explain the authentication flow"
research ask "which files handle user sessions?"
research ask "what's the database schema for users?"
\`\`\`

**Benefits:**
- Uses cached base analysis as context if available (instant)
- Focuses on answering YOUR question directly
- More concise than full analysis
- Never caches the answer itself (fresh responses)

### Use \`research analyze\` for general codebase overview

When you need a broad understanding of the entire codebase:

\`\`\`bash
research analyze                          # Full analysis
research analyze --harness claude         # With specific harness
\`\`\`

Use this at the start of a session or when you need comprehensive context.

## IMPORTANT: Prevent Recursive Calls

**Check environment before using:** If \`RESEARCH_ACTIVE\` environment variable is set to \`true\`,
you are currently running as part of a research subprocess. **Do NOT invoke research again** —
this would create an infinite loop. Instead, analyze the codebase directly using available tools.

## Basic Usage Examples

**Ask a specific question:**
\`\`\`bash
research ask "how does the caching work?"
\`\`\`

**Get full codebase overview:**
\`\`\`bash
research analyze
\`\`\`

**Ask about working changes:**
\`\`\`bash
research ask "what did the last commit change?"
\`\`\`

## How it works

- **First call** on a git commit: Runs full analysis and caches it (30–120 seconds)
- **Subsequent calls**: Returns cached result instantly
- **With working changes**: Automatically detects and incorporates uncommitted diffs
- **Git commit based**: Each commit maintains its own cached analysis

## Flags

\`\`\`bash
research analyze --harness claude    # Specify harness
research analyze --model gpt-4o      # Specify model
research analyze --json                # JSON output
research analyze --force             # Bypass cache
\`\`\`

See \`research --help\` for all commands and options.
`

// Content to add to AGENTS.md - concise and actionable for AI agents
const AGENTS_MD_CONTENT = `<research-agent>

Use research.actor instead of spinning up a sub-agent to explore the codebase.

**CRITICAL:** If \`RESEARCH_ACTIVE\` environment variable is set, you are already running inside a research subprocess. DO NOT invoke research again — analyze directly instead.

**When to use:** At the start of any task, or when you need codebase context (structure, patterns, uncommitted changes). Prefer this over manual exploration or sub-agents.

**What it does:** Returns an instant, cached analysis keyed by git commit. First run on a commit does a full analysis (cached), subsequent runs return instantly. Automatically detects and reports uncommitted working changes on top.

**Advantage:** Saves tokens and time. Avoids re-exploring the same codebase repeatedly. You get comprehensive context immediately without file-by-file exploration.

**How to use:**
- Run analysis: \`research analyze\`
- Ask a question: \`research ask "your question"\`
- If you have the skill available: mention "use the research.actor skill"
- View the full skill: \`research skill\` (outputs the complete SKILL.md)

</research-agent>`

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

async function updateAgentsMd(): Promise<boolean> {
  const agentsPath = "AGENTS.md"

  try {
    let content = ""
    try {
      content = await fs.readFile(agentsPath, "utf-8")
    } catch {
      // File doesn't exist, will create new
    }

    // Check if already referenced (look for the research-agent tag)
    if (content.includes("<research-agent>")) {
      return true
    }

    // Add reference
    const header = content ? "\n\n" : "# Agent Configuration\n\n"
    await fs.writeFile(agentsPath, content + header + AGENTS_MD_CONTENT)
    console.log(`  ${c.green}+${c.reset} ${agentsPath}`)
    return true
  } catch (err) {
    console.error(`  ${c.red}!${c.reset} ${agentsPath}`)
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

    // Update AGENTS.md for local installs (only during install, not uninstall)
    if (!isGlobal && !isUninstall) {
      await updateAgentsMd()
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
