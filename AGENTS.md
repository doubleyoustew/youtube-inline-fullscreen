# AGENTS.md

Guidance for AI coding agents (Claude, Copilot, Cursor, etc.).

- **Formatting:** Prettier is the source of truth. Run `npm run format` before committing. Never hand-format.
- **Diffs:** Only modify lines relevant to the task. Never reformat unrelated files — that hides real changes.
- **Validation:** Run `npm run format:check` to confirm the tree is clean before finishing.
