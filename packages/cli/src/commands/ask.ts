import { defineCommand } from "citty"
import { analyze, detectHarnesses, FsStore, getGitInfo, getRepoRoot, deriveProjectKey } from "@research.actor/core"
import type { HarnessName } from "@research.actor/core"
import { loadConfig } from "./config.js"

const VALID_HARNESSES: readonly HarnessName[] = ["opencode", "claude", "codex", "aider", "gemini"]

function isHarnessName(value: string): value is HarnessName {
  return (VALID_HARNESSES as readonly string[]).includes(value)
}

export const askCommand = defineCommand({
  meta: {
    name: "ask",
    description: "Ask a specific question about the codebase. Uses cached analysis if available, otherwise analyzes on-demand.",
  },
  args: {
    question: {
      type: "positional",
      description: "The question to ask about the codebase",
      required: true,
    },
    harness: {
      type: "string",
      description: `Harness to use for analysis. One of: ${VALID_HARNESSES.join(", ")}. Auto-detected if omitted.`,
      alias: "H",
    },
    model: {
      type: "string",
      description: "Model to pass to the harness (e.g. claude-opus-4-5, gpt-4o).",
      alias: "m",
    },
    json: {
      type: "boolean",
      description: "Output the result as JSON instead of plain text.",
      alias: "j",
      default: false,
    },
  },

  async run({ args }) {
    const question = args.question as string
    
    if (!question || question.trim().length === 0) {
      console.error("Error: Please provide a question to ask.")
      console.error("Example: research ask \"explain the auth flow\"")
      process.exit(1)
    }

    // Resolve harness and model
    let harnessArg: HarnessName | undefined = undefined
    let modelArg: string | undefined = args.model
    
    if (args.harness !== undefined) {
      if (!isHarnessName(args.harness)) {
        console.error(`Invalid harness: "${args.harness}". Must be one of: ${VALID_HARNESSES.join(", ")}`)
        process.exit(1)
      }
      harnessArg = args.harness
    } else {
      const config = await loadConfig()
      if (config.defaultHarness) {
        harnessArg = config.defaultHarness
      }
      if (modelArg === undefined && config.defaultModel) {
        modelArg = config.defaultModel
      }
    }

    const isJson = args.json === true

    // Check if we have cached base analysis
    const cwd = process.cwd()
    const repoRoot = await getRepoRoot(cwd)
    const { gitHash } = await getGitInfo(cwd)
    const projectKey = deriveProjectKey(repoRoot)
    
    const store = new FsStore()
    const cachedEntry = await store.get({ projectKey, gitHash })
    const hasCachedAnalysis = cachedEntry !== null

    // Build the prompt based on whether we have cached analysis
    let systemPrompt: string
    if (hasCachedAnalysis) {
      systemPrompt = `You have access to a cached base analysis of this codebase from commit ${gitHash}. Use it as context to answer the user's specific question accurately and concisely. Focus on answering the question directly - do not generate a general codebase overview unless specifically requested.`
    } else {
      systemPrompt = `No cached analysis available for this codebase. You need to analyze the codebase yourself to answer the user's question. Be thorough but focus specifically on answering their question - don't generate a general codebase overview unless requested.`
    }

    // Use the cached analysis as system prompt context if available
    const fullSystemPrompt = hasCachedAnalysis 
      ? `${systemPrompt}\n\n## CACHED BASE ANALYSIS CONTEXT:\n\n${cachedEntry.analysis}\n\n## USER QUESTION:\n\nAnswer the following question using the context above. Be specific and concise.`
      : systemPrompt

    const result = await analyze({
      cwd,
      force: false, // Never force for ask - use cache or let it analyze on demand
      store,
      ...(harnessArg !== undefined ? { harness: harnessArg } : {}),
      ...(modelArg !== undefined ? { model: modelArg } : {}),
      systemPrompt: fullSystemPrompt,
      prompt: question,
      // Disable streaming when in JSON mode to avoid corrupting output
      ...(isJson ? { stream: false } : {}),
    })

    if (isJson) {
      const output: Record<string, unknown> = {
        answer: result.analysis,
        fromCache: result.fromCache,
        gitHash: result.gitHash,
        projectKey: result.projectKey,
        runner: result.runner,
        hadBaseContext: hasCachedAnalysis,
      }
      console.log(JSON.stringify(output, null, 2))
    } else {
      // Print just the answer (which is the analysis result)
      console.log(result.analysis)
    }
  },
})
