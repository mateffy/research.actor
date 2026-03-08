#!/usr/bin/env node
import { defineCommand, runMain } from "citty"
import { analyzeCommand } from "./commands/analyze.js"
import { clearCommand } from "./commands/clear.js"

/**
 * Root command.
 *
 * Bare `cachelyze [flags]` runs the analysis directly (same as `cachelyze analyze`).
 * The `clear` subcommand removes all cached analyses for the current repo.
 *
 * citty routes to a subcommand when the first argument matches a known subcommand
 * name; otherwise it falls through to the root `run`, which is the analyze logic.
 */
const main = defineCommand({
  ...analyzeCommand,
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
})

runMain(main)
