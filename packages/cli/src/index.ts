#!/usr/bin/env node
import { defineCommand, runMain } from "citty"
import { analyzeCommand } from "./commands/analyze.js"
import { clearCommand } from "./commands/clear.js"
import { skillCommand } from "./commands/skill.js"
import { configCommand } from "./commands/config.js"
import { askCommand } from "./commands/ask.js"

/**
 * Root command.
 *
 * Bare `research [flags]` runs the analysis directly (same as `research analyze`).
 * The `clear` subcommand removes all cached analyses for the current repo.
 * The `skill` subcommand installs the research skill to AI coding agents.
 * The `config` subcommand manages settings like default harness.
 * The `ask` subcommand answers specific questions about the codebase.
 *
 * The root command has no run handler - it either shows help (no args) or
 * delegates to subcommands. For bare invocations with flags, users should
 * use the explicit `analyze` subcommand.
 */
const main = defineCommand({
  meta: {
    name: "research",
    description:
      "Cached codebase analysis for AI agents. " +
      "Run `research analyze` to analyze the current repo, " +
      "`research ask` to answer specific questions, " +
      "or `research skill` to install the agent skill.",
  },
  subCommands: {
    analyze: analyzeCommand,
    clear: clearCommand,
    skill: skillCommand,
    config: configCommand,
    ask: askCommand,
  },
})

runMain(main)
