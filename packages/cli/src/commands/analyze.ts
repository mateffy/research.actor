import { defineCommand } from "citty"
import { analyze, detectHarnesses, FsStore } from "@cachelyze/core"
import type { HarnessName } from "@cachelyze/core"

const VALID_HARNESSES: readonly HarnessName[] = ["opencode", "claude", "codex", "aider", "gemini"]

function isHarnessName(value: string): value is HarnessName {
  return (VALID_HARNESSES as readonly string[]).includes(value)
}

/**
 * Parse a human-friendly duration string into milliseconds.
 * Supported units: ms, s, m, h, d
 * Examples: "30m", "2h", "7d", "90s", "500ms"
 */
function parseDuration(value: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/.exec(value.trim())
  if (!match) return null
  const n = parseFloat(match[1] ?? "0")
  const unit = match[2] ?? "ms"
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  }
  const mult = multipliers[unit]
  if (mult === undefined) return null
  return Math.round(n * mult)
}

export const analyzeCommand = defineCommand({
  meta: {
    name: "cachelyze",
    description:
      "Produce a cached codebase analysis for AI agents. Runs a full analysis on first call, " +
      "returns cached result on subsequent calls for the same git commit, and always analyzes " +
      "uncommitted working changes on top.",
  },
  args: {
    harness: {
      type: "string",
      description: `Harness to use for analysis. One of: ${VALID_HARNESSES.join(", ")}. Auto-detected if omitted.`,
      alias: "H",
    },
    model: {
      type: "string",
      description: "Model name to pass to the harness (e.g. claude-opus-4-5, gpt-4o).",
      alias: "m",
    },
    "system-prompt": {
      type: "string",
      description:
        "Appended to the base analysis prompt. Customizes what the cached analysis focuses on. " +
        "Different system prompts produce separate cache entries.",
      alias: "s",
    },
    prompt: {
      type: "string",
      description:
        "Passed only to the working-changes agent — never cached. Use for targeted questions " +
        "about the current diff or specific aspects of in-progress work.",
      alias: "p",
    },
    force: {
      type: "boolean",
      description: "Bypass cache and re-run the full analysis.",
      alias: "f",
      default: false,
    },
    "max-age": {
      type: "string",
      description:
        "Only use a cached entry if it is younger than this duration. " +
        "Accepts: ms, s, m, h, d — e.g. '30m', '2h', '7d'. " +
        "Stale entries are re-run and the new result replaces them in the cache.",
      alias: "a",
    },
    json: {
      type: "boolean",
      description: "Output the result as JSON instead of plain text.",
      alias: "j",
      default: false,
    },
    "list-harnesses": {
      type: "boolean",
      description: "List all harnesses detected on this system and exit.",
      alias: "l",
      default: false,
    },
  },

  async run({ args }) {
    // --list-harnesses
    if (args["list-harnesses"]) {
      const available = await detectHarnesses()
      if (available.length === 0) {
        console.error("No supported harnesses found in PATH.")
        console.error(`Install one of: ${VALID_HARNESSES.join(", ")}`)
        process.exit(1)
      }
      for (const h of available) {
        console.log(`${h.name}  ${h.binPath}`)
      }
      return
    }

    // Validate --harness
    const harnessArg = args.harness
    if (harnessArg !== undefined && !isHarnessName(harnessArg)) {
      console.error(`Invalid harness: "${harnessArg}". Must be one of: ${VALID_HARNESSES.join(", ")}`)
      process.exit(1)
    }

    // Validate --max-age
    let maxAge: number | undefined
    if (args["max-age"] !== undefined) {
      const parsed = parseDuration(args["max-age"])
      if (parsed === null || parsed <= 0) {
        console.error(
          `Invalid --max-age value: "${args["max-age"]}". ` +
          `Use a positive number with a unit, e.g. "30m", "2h", "7d", "90s".`,
        )
        process.exit(1)
      }
      maxAge = parsed
    }

    const isJson = args.json === true

    const result = await analyze({
      cwd: process.cwd(),
      force: args.force,
      store: new FsStore(),
      ...(harnessArg !== undefined ? { harness: harnessArg } : {}),
      ...(args.model !== undefined ? { model: args.model } : {}),
      ...(args["system-prompt"] !== undefined ? { systemPrompt: args["system-prompt"] } : {}),
      ...(args.prompt !== undefined ? { prompt: args.prompt } : {}),
      ...(maxAge !== undefined ? { maxAge } : {}),
      // Disable streaming when in JSON mode to avoid corrupting output
      ...(isJson ? { stream: false } : {}),
    })

    if (isJson) {
      const output: Record<string, unknown> = {
        analysis: result.analysis,
        fromCache: result.fromCache,
        gitHash: result.gitHash,
        projectKey: result.projectKey,
        runner: result.runner,
      }
      console.log(JSON.stringify(output, null, 2))
    } else {
      console.log(result.analysis)
    }
  },
})
