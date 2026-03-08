import { execFile, spawn } from "node:child_process"
import { promisify } from "node:util"
import {
  HarnessNotFoundError,
  type HarnessDefinition,
  type HarnessName,
  type HarnessRunner,
  type ResolvedHarness,
  type RunRequest,
  type RunResult,
} from "./types.js"

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// Subprocess harness registry
// ---------------------------------------------------------------------------

/**
 * Registry of all supported subprocess harnesses.
 * Each entry defines how to locate and build argv for the binary.
 */
const HARNESS_REGISTRY: readonly HarnessDefinition[] = [
  {
    name: "opencode",
    bins: ["opencode"],
    buildArgs: (prompt, model) => {
      const args: string[] = ["run", "--message", prompt]
      if (model) args.push("--model", model)
      return args
    },
  },
  {
    name: "claude",
    bins: ["claude"],
    buildArgs: (prompt, model) => {
      const args: string[] = ["-p", prompt]
      if (model) args.push("--model", model)
      return args
    },
  },
  {
    name: "codex",
    bins: ["codex"],
    buildArgs: (prompt, model) => {
      const args: string[] = ["-q", prompt]
      if (model) args.push("--model", model)
      return args
    },
  },
  {
    name: "aider",
    bins: ["aider"],
    buildArgs: (prompt, model) => {
      const args: string[] = ["--message", prompt, "--yes-always", "--no-git"]
      if (model) args.push("--model", model)
      return args
    },
  },
  {
    name: "gemini",
    bins: ["gemini"],
    buildArgs: (prompt, model) => {
      const args: string[] = ["-p", prompt]
      if (model) args.push("--model", model)
      return args
    },
  },
]

async function which(bin: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("which", [bin])
    const resolved = stdout.trim()
    return resolved.length > 0 ? resolved : null
  } catch {
    return null
  }
}

/**
 * Detect all subprocess harnesses installed on the current system.
 * Returns `ResolvedHarness` objects (binary path + argv builder) for each found binary.
 */
export async function detectHarnesses(): Promise<ResolvedHarness[]> {
  const results = await Promise.all(
    HARNESS_REGISTRY.map(async (def) => {
      for (const bin of def.bins) {
        const binPath = await which(bin)
        if (binPath) {
          return { name: def.name, binPath, buildArgs: def.buildArgs } satisfies ResolvedHarness
        }
      }
      return null
    }),
  )
  return results.filter((r): r is ResolvedHarness => r !== null)
}

/**
 * Resolve a named harness definition to a `ResolvedHarness` (binary path + argv builder).
 * Picks the first installed harness when no name is given.
 */
export async function resolveHarness(name?: HarnessName): Promise<ResolvedHarness> {
  if (name) {
    const def = HARNESS_REGISTRY.find((d) => d.name === name)
    if (!def) throw new HarnessNotFoundError(name)
    for (const bin of def.bins) {
      const binPath = await which(bin)
      if (binPath) return { name: def.name, binPath, buildArgs: def.buildArgs }
    }
    throw new HarnessNotFoundError(name)
  }
  const available = await detectHarnesses()
  const first = available[0]
  if (!first) throw new HarnessNotFoundError()
  return first
}

// ---------------------------------------------------------------------------
// SubprocessRunner — the default HarnessRunner implementation
// ---------------------------------------------------------------------------

/**
 * A `HarnessRunner` that executes a coding agent as a child process.
 *
 * This is the default runner used by cachelyze when no custom `runner` is
 * provided in `AnalyzeOptions`. It wraps a `ResolvedHarness` (a known binary
 * + its argv-builder) and streams stdout to `process.stdout` in real time.
 *
 * To use a specific harness or binary, construct one directly:
 * ```ts
 * const resolved = await resolveHarness("claude")
 * const runner = new SubprocessRunner(resolved)
 * await analyze({ runner })
 * ```
 *
 * Or let `analyze()` build one automatically via harness auto-detection.
 */
export class SubprocessRunner implements HarnessRunner {
  readonly name: string
  private readonly harness: ResolvedHarness

  constructor(harness: ResolvedHarness) {
    this.harness = harness
    this.name = harness.name
  }

  async run(request: RunRequest): Promise<RunResult> {
    const { prompt, cwd, model } = request
    const args = this.harness.buildArgs(prompt, model)

    return new Promise<RunResult>((resolve, reject) => {
      const child = spawn(this.harness.binPath, [...args], {
        cwd,
        stdio: ["inherit", "pipe", "pipe"],
      })

      const chunks: Buffer[] = []

      child.stdout.on("data", (chunk: Buffer) => {
        chunks.push(chunk)
        // Stream to stdout for live UX feedback
        process.stdout.write(chunk)
      })

      child.stderr.on("data", (chunk: Buffer) => {
        // Forward stderr so users see harness progress/errors
        process.stderr.write(chunk)
      })

      child.on("close", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Runner "${this.name}" exited with code ${code}`))
          return
        }
        resolve({ output: Buffer.concat(chunks).toString("utf8").trim() })
      })

      child.on("error", (err) => {
        reject(new Error(`Failed to spawn runner "${this.name}": ${(err as Error).message}`))
      })
    })
  }
}

/**
 * Build a `SubprocessRunner` from a harness name (or auto-detect).
 * Convenience wrapper used internally by `analyze()`.
 */
export async function resolveSubprocessRunner(name?: HarnessName): Promise<SubprocessRunner> {
  const harness = await resolveHarness(name)
  return new SubprocessRunner(harness)
}

// ---------------------------------------------------------------------------
// Legacy export — kept for SDK consumers who used invokeHarness directly
// ---------------------------------------------------------------------------

/** @deprecated Use a `SubprocessRunner` instance instead. */
export interface InvokeOptions {
  readonly harness: ResolvedHarness
  readonly prompt: string
  readonly model?: string
  readonly cwd: string
  readonly stream?: boolean
}

/** @deprecated Use a `SubprocessRunner` instance instead. */
export async function invokeHarness(opts: InvokeOptions): Promise<string> {
  const runner = new SubprocessRunner(opts.harness)
  const { output } = await runner.run({
    prompt: opts.prompt,
    cwd: opts.cwd,
    ...(opts.model !== undefined ? { model: opts.model } : {}),
  })
  return output
}
