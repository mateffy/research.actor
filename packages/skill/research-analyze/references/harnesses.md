# Supported Harnesses

`research` invokes a coding agent harness as a subprocess to perform analysis.
The following harnesses are supported and auto-detected via `which`:

| Harness name | Binary     | Install                          |
|--------------|------------|----------------------------------|
| `opencode`   | `opencode` | https://opencode.ai              |
| `claude`     | `claude`   | `npm install -g @anthropic-ai/claude-code` |
| `codex`      | `codex`    | `npm install -g @openai/codex`   |
| `aider`      | `aider`    | `pip install aider-chat`         |
| `gemini`     | `gemini`   | `npm install -g @google/gemini-cli` |

## Detection order

When no `--harness` flag is provided, `research` runs `which` for each harness binary
in the order listed above and uses the first one found.

To see which harnesses are detected on the current system:

```bash
research --list-harnesses
```

## Recommendation

For best results, use a harness with strong tool-use capabilities (file reading, search, git).
`opencode` and `claude` (Claude Code) are well-suited for codebase exploration tasks.
