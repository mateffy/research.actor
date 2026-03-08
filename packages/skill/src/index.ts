import { join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

/**
 * Absolute path to the `research-analyze` skill directory.
 * Pass this to your agent harness or skill loader.
 *
 * @example
 * ```ts
 * import { skillDir } from "@research.actor/skill"
 * // skillDir === "/path/to/node_modules/@research.actor/skill/research-analyze"
 * ```
 */
export const skillDir: string = join(__dirname, "..", "research-analyze")

/**
 * Absolute path to the `SKILL.md` file for the research-analyze skill.
 *
 * @example
 * ```ts
 * import { skillMdPath } from "@research.actor/skill"
 * const contents = await readFile(skillMdPath, "utf8")
 * ```
 */
export const skillMdPath: string = join(skillDir, "SKILL.md")

/**
 * Skill name as defined in SKILL.md frontmatter.
 * Matches the directory name per the agentskills.io spec.
 */
export const SKILL_NAME = "research-analyze" as const

/**
 * Short description of the skill, suitable for display in skill listings.
 */
export const SKILL_DESCRIPTION: string =
  "Use research to get an instant, cached analysis of the current codebase instead of " +
  "exploring the repository from scratch."
