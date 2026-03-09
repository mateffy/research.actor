import { defineCommand } from "citty"
import { promises as fs } from "fs"
import * as path from "path"
import type { HarnessName } from "@research.actor/core"

const VALID_HARNESSES: readonly HarnessName[] = ["opencode", "claude", "codex", "aider", "gemini"]

// Check if colors should be disabled
const noColor = process.env.NO_COLOR !== undefined || process.env.TERM === "dumb"
const forceColor = process.env.FORCE_COLOR !== undefined
const useColor = forceColor || (!noColor && process.stdout.isTTY)

// ANSI color codes
const c = {
  reset: useColor ? "\x1b[0m" : "",
  bold: useColor ? "\x1b[1m" : "",
  dim: useColor ? "\x1b[2m" : "",
  red: useColor ? "\x1b[31m" : "",
  green: useColor ? "\x1b[32m" : "",
  yellow: useColor ? "\x1b[33m" : "",
  cyan: useColor ? "\x1b[36m" : "",
  gray: useColor ? "\x1b[90m" : "",
}

// Unicode symbols
const s = {
  check: "\u2713",
  cross: "\u2717",
  bullet: "\u2022",
}

interface Config {
  defaultHarness?: HarnessName
  defaultModel?: string
}

function getConfigPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "/"
  return path.join(home, ".config", "research", "config.json")
}

async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath()
  try {
    const content = await fs.readFile(configPath, "utf-8")
    return JSON.parse(content) as Config
  } catch {
    return {}
  }
}

async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath()
  const dir = path.dirname(configPath)
  
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {
    // Directory might already exist
  }
  
  await fs.writeFile(configPath, JSON.stringify(config, null, 2))
}

export const configCommand = defineCommand({
  meta: {
    name: "config",
    description: "Manage research configuration including default harness and model.",
  },
  args: {
    harness: {
      type: "string",
      description: `Set default harness. One of: ${VALID_HARNESSES.join(", ")}`,
      alias: "H",
    },
    model: {
      type: "string",
      description: "Set default model (e.g., claude-sonnet-4-5, gpt-4o)",
      alias: "m",
    },
    clear: {
      type: "boolean",
      description: "Clear all default configuration (harness and model)",
      alias: "c",
      default: false,
    },
    "clear-harness": {
      type: "boolean",
      description: "Clear default harness only",
      default: false,
    },
    "clear-model": {
      type: "boolean",
      description: "Clear default model only",
      default: false,
    },
  },

  async run({ args }) {
    const config = await loadConfig()
    let modified = false
    
    // Set default harness
    if (args.harness !== undefined) {
      const harness = args.harness as HarnessName
      if (!VALID_HARNESSES.includes(harness)) {
        console.error(`${c.red}Error: Invalid harness "${harness}"${c.reset}`)
        console.error(`Must be one of: ${VALID_HARNESSES.join(", ")}`)
        process.exit(1)
      }
      
      config.defaultHarness = harness
      modified = true
      console.log(`${c.green}${s.check}${c.reset} Default harness set to: ${c.cyan}${harness}${c.reset}`)
    }
    
    // Set default model
    if (args.model !== undefined) {
      config.defaultModel = args.model
      modified = true
      console.log(`${c.green}${s.check}${c.reset} Default model set to: ${c.cyan}${args.model}${c.reset}`)
    }
    
    // Save if modified
    if (modified) {
      await saveConfig(config)
      return
    }
    
    // Clear all defaults
    if (args.clear) {
      let cleared = false
      if (config.defaultHarness || config.defaultModel) {
        delete config.defaultHarness
        delete config.defaultModel
        await saveConfig(config)
        cleared = true
      }
      console.log(`${cleared ? c.green + s.check : c.gray + s.bullet}${c.reset} ${cleared ? "All defaults cleared" : "No defaults configured"}`)
      return
    }
    
    // Clear harness only
    if (args["clear-harness"]) {
      if (config.defaultHarness) {
        delete config.defaultHarness
        await saveConfig(config)
        console.log(`${c.green}${s.check}${c.reset} Default harness cleared`)
      } else {
        console.log(`${c.gray}${s.bullet}${c.reset} No default harness configured`)
      }
      return
    }
    
    // Clear model only
    if (args["clear-model"]) {
      if (config.defaultModel) {
        delete config.defaultModel
        await saveConfig(config)
        console.log(`${c.green}${s.check}${c.reset} Default model cleared`)
      } else {
        console.log(`${c.gray}${s.bullet}${c.reset} No default model configured`)
      }
      return
    }
    
    // Show current config
    console.log(`${c.bold}Configuration${c.reset}`)
    console.log(``)
    
    const configPath = getConfigPath()
    console.log(`${c.gray}Config file:${c.reset} ${configPath}`)
    console.log(``)
    
    if (config.defaultHarness) {
      console.log(`${c.gray}Default harness:${c.reset} ${c.cyan}${config.defaultHarness}${c.reset}`)
    } else {
      console.log(`${c.gray}Default harness:${c.reset} ${c.dim}(not set - auto-detects)${c.reset}`)
    }
    
    if (config.defaultModel) {
      console.log(`${c.gray}Default model:${c.reset} ${c.cyan}${config.defaultModel}${c.reset}`)
    } else {
      console.log(`${c.gray}Default model:${c.reset} ${c.dim}(not set)${c.reset}`)
    }
    
    console.log(``)
    console.log(`${c.gray}Set harness:${c.reset} research config --harness claude`)
    console.log(`${c.gray}Set model:${c.reset} research config --model claude-sonnet-4-5`)
    console.log(`${c.gray}Clear all:${c.reset} research config --clear`)
  },
})

// Export for use in analyze command
export { loadConfig }
