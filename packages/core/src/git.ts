import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { GitError, type GitInfo } from "./types.js"

const execFileAsync = promisify(execFile)

async function git(args: readonly string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", [...args], { cwd })
    return stdout.trim()
  } catch (err) {
    throw new GitError(
      `git ${args.join(" ")} failed in ${cwd}`,
      err,
    )
  }
}

export async function getRepoRoot(cwd: string): Promise<string> {
  return git(["rev-parse", "--show-toplevel"], cwd)
}

export async function getCurrentHash(cwd: string): Promise<string> {
  return git(["rev-parse", "HEAD"], cwd)
}

export async function hasWorkingChanges(cwd: string): Promise<boolean> {
  try {
    // --porcelain exits with output if there are changes (staged or unstaged)
    const status = await git(["status", "--porcelain"], cwd)
    return status.length > 0
  } catch {
    return false
  }
}

export async function getGitInfo(cwd: string): Promise<GitInfo> {
  const repoRoot = await getRepoRoot(cwd)
  const [hash, dirty] = await Promise.all([
    getCurrentHash(repoRoot),
    hasWorkingChanges(repoRoot),
  ])
  return { hash, repoRoot, hasWorkingChanges: dirty }
}
