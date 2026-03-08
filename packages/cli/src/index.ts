#!/usr/bin/env node
import { defineCommand, runMain } from "citty"
import { analyzeCommand } from "./commands/analyze.js"
import { clearCommand } from "./commands/clear.js"

/**
 * Root command.
 *
 * Bare `cachelyze` runs the analysis (delegates to the `analyze` subcommand).
 * All analyze flags are available at the root level for convenience.
 *
 * Subcommands:
 *   cachelyze analyze  — explicit alias for the default behaviour
 *   cachelyze clear    — remove all cached analyses for the current repo
 */
const main = defineCommand({
  meta: {
    name: "cachelyze",
    description:
      "Cached codebase analysis for AI agents. " +
      "Run without a subcommand to analyze the current repo.",
  },
  subCommands: {
    analyze: analyzeCommand,
    clear: clearCommand,
  },
  // When invoked without a subcommand, run the analysis directly
  run() {
    // citty will call the default subcommand automatically when subCommands is
    // defined and no subcommand is matched; we just need this run to re-delegate.
    return analyzeCommand.run?.call(this, arguments[0] as never)
  },
})

runMain(main)
