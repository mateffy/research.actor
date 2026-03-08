// src/config.ts
import { createHash } from "node:crypto";
import { basename } from "node:path";
function deriveProjectKey(repoRoot) {
  const name = basename(repoRoot);
  const hash = createHash("sha256").update(repoRoot).digest("hex").slice(0, 8);
  return `${name}-${hash}`;
}

// src/git.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// src/types.ts
class CachelyzError extends Error {
  cause;
  constructor(message, cause) {
    super(message);
    this.name = "CachelyzError";
    this.cause = cause;
  }
}

class HarnessNotFoundError extends CachelyzError {
  constructor(requested) {
    super(requested ? `Harness "${requested}" is not installed or not found in PATH` : "No supported harness found. Install one of: opencode, claude, codex, aider, gemini");
    this.name = "HarnessNotFoundError";
  }
}

class GitError extends CachelyzError {
  constructor(message, cause) {
    super(message, cause);
    this.name = "GitError";
  }
}

// src/git.ts
var execFileAsync = promisify(execFile);
async function git(args, cwd) {
  try {
    const { stdout } = await execFileAsync("git", [...args], { cwd });
    return stdout.trim();
  } catch (err) {
    throw new GitError(`git ${args.join(" ")} failed in ${cwd}`, err);
  }
}
async function getRepoRoot(cwd) {
  return git(["rev-parse", "--show-toplevel"], cwd);
}
async function getCurrentHash(cwd) {
  return git(["rev-parse", "HEAD"], cwd);
}
async function hasWorkingChanges(cwd) {
  try {
    const status = await git(["status", "--porcelain"], cwd);
    return status.length > 0;
  } catch {
    return false;
  }
}
async function getGitInfo(cwd) {
  const repoRoot = await getRepoRoot(cwd);
  const [hash, dirty] = await Promise.all([
    getCurrentHash(repoRoot),
    hasWorkingChanges(repoRoot)
  ]);
  return { hash, repoRoot, hasWorkingChanges: dirty };
}

// src/harness.ts
import { execFile as execFile2, spawn } from "node:child_process";
import { promisify as promisify2 } from "node:util";
var execFileAsync2 = promisify2(execFile2);
var HARNESS_REGISTRY = [
  {
    name: "opencode",
    bins: ["opencode"],
    buildArgs: (prompt, model) => {
      const args = ["run", "--message", prompt];
      if (model)
        args.push("--model", model);
      return args;
    }
  },
  {
    name: "claude",
    bins: ["claude"],
    buildArgs: (prompt, model) => {
      const args = ["-p", prompt];
      if (model)
        args.push("--model", model);
      return args;
    }
  },
  {
    name: "codex",
    bins: ["codex"],
    buildArgs: (prompt, model) => {
      const args = ["-q", prompt];
      if (model)
        args.push("--model", model);
      return args;
    }
  },
  {
    name: "aider",
    bins: ["aider"],
    buildArgs: (prompt, model) => {
      const args = ["--message", prompt, "--yes-always", "--no-git"];
      if (model)
        args.push("--model", model);
      return args;
    }
  },
  {
    name: "gemini",
    bins: ["gemini"],
    buildArgs: (prompt, model) => {
      const args = ["-p", prompt];
      if (model)
        args.push("--model", model);
      return args;
    }
  }
];
async function which(bin) {
  try {
    const { stdout } = await execFileAsync2("which", [bin]);
    const resolved = stdout.trim();
    return resolved.length > 0 ? resolved : null;
  } catch {
    return null;
  }
}
async function detectHarnesses() {
  const results = await Promise.all(HARNESS_REGISTRY.map(async (def) => {
    for (const bin of def.bins) {
      const binPath = await which(bin);
      if (binPath) {
        return { name: def.name, binPath, buildArgs: def.buildArgs };
      }
    }
    return null;
  }));
  return results.filter((r) => r !== null);
}
async function resolveHarness(name) {
  if (name) {
    const def = HARNESS_REGISTRY.find((d) => d.name === name);
    if (!def)
      throw new HarnessNotFoundError(name);
    for (const bin of def.bins) {
      const binPath = await which(bin);
      if (binPath)
        return { name: def.name, binPath, buildArgs: def.buildArgs };
    }
    throw new HarnessNotFoundError(name);
  }
  const available = await detectHarnesses();
  const first = available[0];
  if (!first)
    throw new HarnessNotFoundError;
  return first;
}

class SubprocessRunner {
  name;
  harness;
  constructor(harness) {
    this.harness = harness;
    this.name = harness.name;
  }
  async run(request) {
    const { prompt, cwd, model, stream = true } = request;
    const args = this.harness.buildArgs(prompt, model);
    const env = { ...process.env };
    if (this.name === "opencode") {
      delete env.OPENCODE_SERVER_PASSWORD;
      delete env.OPENCODE_SERVER_USERNAME;
      delete env.OPENCODE_CLIENT;
    }
    return new Promise((resolve, reject) => {
      const child = spawn(this.harness.binPath, [...args], {
        cwd,
        stdio: ["inherit", "pipe", "pipe"],
        env
      });
      const chunks = [];
      child.stdout.on("data", (chunk) => {
        chunks.push(chunk);
        if (stream) {
          process.stdout.write(chunk);
        }
      });
      child.stderr.on("data", (chunk) => {
        process.stderr.write(chunk);
      });
      child.on("close", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Runner "${this.name}" exited with code ${code}`));
          return;
        }
        resolve({ output: Buffer.concat(chunks).toString("utf8").trim() });
      });
      child.on("error", (err) => {
        reject(new Error(`Failed to spawn runner "${this.name}": ${err.message}`));
      });
    });
  }
}
async function resolveSubprocessRunner(name) {
  const harness = await resolveHarness(name);
  return new SubprocessRunner(harness);
}
async function invokeHarness(opts) {
  const runner = new SubprocessRunner(opts.harness);
  const { output } = await runner.run({
    prompt: opts.prompt,
    cwd: opts.cwd,
    ...opts.model !== undefined ? { model: opts.model } : {}
  });
  return output;
}

// src/prompts.ts
function buildBaseAnalysisPrompt(systemPrompt) {
  const base = `You are performing a one-time codebase analysis that will be cached and reused by future AI agents.
Your job is to produce a comprehensive, dense developer overview of this codebase.

Explore the codebase thoroughly using your available tools. Do NOT ask questions or wait for input.

Your analysis MUST cover:
- High-level architecture and project purpose
- Directory and module structure with responsibilities for each key area
- Core abstractions, data models, and interfaces
- Primary data flows and control flows
- Technology stack, frameworks, and notable dependencies
- Entry points, main executables, and important configuration files
- Key design patterns and conventions used throughout
- Any non-obvious gotchas, constraints, or important context a new developer needs

Write as dense, information-rich prose and structured lists. This output will be consumed by
another LLM as context — optimize for completeness and signal density, not readability.

Output ONLY the analysis text. No preamble, no "here is my analysis", no closing remarks.`;
  if (!systemPrompt)
    return base;
  return `${base}

Additional analysis focus:
${systemPrompt}`;
}
function buildWorkingChangesPrompt(cachedAnalysis, userPrompt) {
  const base = `You are analyzing uncommitted working changes in a codebase. A cached analysis of the committed
codebase is provided below as context.

CACHED CODEBASE ANALYSIS:
---
${cachedAnalysis}
---

Using your available tools, discover the current uncommitted changes in this repository
(e.g. via \`git diff HEAD\`, \`git status\`, or similar). Explore any changed files as needed.

Then produce a concise update that describes:
- What has changed compared to the committed state
- Which parts of the codebase are affected and how
- The current overall state of the project incorporating these changes
- Any notable implications or risks from the in-progress changes

Output ONLY the updated analysis. No preamble, no closing remarks.`;
  if (!userPrompt)
    return base;
  return `${base}

Additional focus for this analysis:
${userPrompt}`;
}

// src/stores/memory.ts
function toMapKey(key) {
  return [key.projectKey, key.gitHash, key.systemPromptHash ?? ""].join("::");
}

class MemoryStore {
  entries = new Map;
  async get(key) {
    return this.entries.get(toMapKey(key)) ?? null;
  }
  async set(key, entry) {
    this.entries.set(toMapKey(key), entry);
  }
  async delete(key) {
    this.entries.delete(toMapKey(key));
  }
  get size() {
    return this.entries.size;
  }
  clear() {
    this.entries.clear();
  }
}

// src/stores/fs.ts
import { createHash as createHash2 } from "node:crypto";
import { mkdir, readFile, writeFile, unlink, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
function defaultCacheBaseDir() {
  const xdg = process.env["XDG_CACHE_HOME"];
  if (xdg)
    return join(xdg, "cachelyze");
  return join(homedir(), ".cache", "cachelyze");
}
function keyToFilename(key) {
  if (!key.systemPromptHash)
    return `${key.gitHash}.json`;
  return `${key.gitHash}-${key.systemPromptHash}.json`;
}

class FsStore {
  baseDir;
  constructor(baseDir) {
    this.baseDir = baseDir ?? defaultCacheBaseDir();
  }
  filePath(key) {
    return join(this.baseDir, key.projectKey, keyToFilename(key));
  }
  async get(key) {
    const filePath = this.filePath(key);
    if (!existsSync(filePath))
      return null;
    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  async set(key, entry) {
    const dir = join(this.baseDir, key.projectKey);
    await mkdir(dir, { recursive: true });
    await writeFile(this.filePath(key), JSON.stringify(entry, null, 2), "utf8");
  }
  async delete(key) {
    const filePath = this.filePath(key);
    if (!existsSync(filePath))
      return;
    await unlink(filePath);
  }
  async clearProject(projectKey) {
    const dir = join(this.baseDir, projectKey);
    if (!existsSync(dir))
      return 0;
    const files = await readdir(dir);
    await rm(dir, { recursive: true, force: true });
    return files.length;
  }
}
function hashSystemPrompt(systemPrompt) {
  return createHash2("sha256").update(systemPrompt).digest("hex").slice(0, 12);
}

// src/analyze.ts
async function analyze(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const store = opts.store ?? new MemoryStore;
  const git2 = await getGitInfo(cwd);
  const projectKey = deriveProjectKey(git2.repoRoot);
  const systemPromptHash = opts.systemPrompt ? hashSystemPrompt(opts.systemPrompt) : undefined;
  const runner = opts.runner ?? await resolveSubprocessRunner(opts.harness);
  const cacheKey = {
    projectKey,
    gitHash: git2.hash,
    ...systemPromptHash !== undefined ? { systemPromptHash } : {}
  };
  let cachedEntry = null;
  if (!opts.force) {
    const stored = await store.get(cacheKey);
    if (stored !== null && opts.maxAge !== undefined) {
      const ageMs = Date.now() - new Date(stored.createdAt).getTime();
      cachedEntry = ageMs <= opts.maxAge ? stored : null;
    } else {
      cachedEntry = stored;
    }
  }
  let baseAnalysis;
  let fromCache;
  if (cachedEntry) {
    baseAnalysis = cachedEntry.analysis;
    fromCache = true;
  } else {
    const basePrompt = buildBaseAnalysisPrompt(opts.systemPrompt);
    const result = await runner.run({
      prompt: basePrompt,
      cwd: git2.repoRoot,
      ...opts.model !== undefined ? { model: opts.model } : {},
      ...opts.stream !== undefined ? { stream: opts.stream } : {}
    });
    baseAnalysis = result.output;
    const entry = {
      gitHash: git2.hash,
      projectKey,
      createdAt: new Date().toISOString(),
      runner: runner.name,
      analysis: baseAnalysis,
      ...opts.model !== undefined ? { model: opts.model } : {},
      ...systemPromptHash !== undefined ? { systemPromptHash } : {}
    };
    await store.set(cacheKey, entry);
    fromCache = false;
  }
  let finalAnalysis = baseAnalysis;
  if (git2.hasWorkingChanges || opts.prompt) {
    const workingPrompt = buildWorkingChangesPrompt(baseAnalysis, opts.prompt);
    const result = await runner.run({
      prompt: workingPrompt,
      cwd: git2.repoRoot,
      ...opts.model !== undefined ? { model: opts.model } : {},
      ...opts.stream !== undefined ? { stream: opts.stream } : {}
    });
    finalAnalysis = result.output;
  }
  return {
    analysis: finalAnalysis,
    fromCache,
    gitHash: git2.hash,
    projectKey,
    runner: runner.name
  };
}
export {
  resolveSubprocessRunner,
  resolveHarness,
  invokeHarness,
  hashSystemPrompt,
  hasWorkingChanges,
  getRepoRoot,
  getGitInfo,
  getCurrentHash,
  detectHarnesses,
  deriveProjectKey,
  buildWorkingChangesPrompt,
  buildBaseAnalysisPrompt,
  analyze,
  SubprocessRunner,
  MemoryStore,
  HarnessNotFoundError,
  GitError,
  FsStore,
  CachelyzError
};
