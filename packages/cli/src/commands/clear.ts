import { defineCommand } from "citty"
import { getRepoRoot, deriveProjectKey, FsStore } from "@research.actor/core"
import { GitError } from "@research.actor/core"

export const clearCommand = defineCommand({
  meta: {
    name: "clear",
    description:
      "Remove all cached analyses for the current repository. " +
      "The next run will re-analyze from scratch.",
  },
  args: {
    "cache-dir": {
      type: "string",
      description: "Custom cache directory (defaults to ~/.cache/research).",
    },
  },

  async run({ args }) {
    let repoRoot: string
    try {
      repoRoot = await getRepoRoot(process.cwd())
    } catch (err) {
      if (err instanceof GitError) {
        console.error("Not inside a git repository.")
        process.exit(1)
      }
      throw err
    }

    const projectKey = deriveProjectKey(repoRoot)
    const store = new FsStore(args["cache-dir"])
    const count = await store.clearProject(projectKey)

    if (count === 0) {
      console.log(`No cached analyses found for ${repoRoot}`)
    } else {
      console.log(
        `Cleared ${count} cached ${count === 1 ? "entry" : "entries"} for ${repoRoot}`,
      )
    }
  },
})
