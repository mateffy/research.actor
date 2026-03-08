import { join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

/**
 * Absolute path to the `cachelyze-analyze` skill directory.
 * Pass this to your agent harness or skill loader.
 *
 * @example
 * ```ts
 * import { skillDir } from "@cachelyze/skill"
 * // skillDir === "/path/to/node_modules/@cachelyze/skill/cachelyze-analyze"
 * ```
 */
export const skillDir: string = join(__dirname, "..", "cachelyze-analyze")

/**
 * Absolute path to the `SKILL.md` file for the cachelyze-analyze skill.
 *
 * @example
 * ```ts
 * import { skillMdPath } from "@cachelyze/skill"
 * const contents = await readFile(skillMdPath, "utf8")
 * ```
 */
export const skillMdPath: string = join(skillDir, "SKILL.md")

/**
 * Skill name as defined in SKILL.md frontmatter.
 * Matches the directory name per the agentskills.io spec.
 */
export const SKILL_NAME = "cachelyze-analyze" as const

/**
 * Short description of the skill, suitable for display in skill listings.
 */
export const SKILL_DESCRIPTION: string =
  "Use cachelyze to get an instant, cached analysis of the current codebase instead of " +
  "exploring the repository from scratch."
