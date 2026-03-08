import { createHash } from "node:crypto"
import { basename } from "node:path"

/**
 * Derive a stable, collision-resistant project key from the repo root path.
 * Format: `<dirname>-<8 hex chars of sha256(absPath)>`
 * e.g. `"my-app-3f2a1b4c"`
 */
export function deriveProjectKey(repoRoot: string): string {
  const name = basename(repoRoot)
  const hash = createHash("sha256").update(repoRoot).digest("hex").slice(0, 8)
  return `${name}-${hash}`
}
