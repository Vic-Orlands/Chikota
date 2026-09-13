Don't add unnecessary comments when coding, in fact, almost no comments...Only add comments to explain a complex logic, function, components, etc...if its just a regular code, don't add any comments at all.

Listen to instructions properly and ask for clarifications if you don't get the full perspective.

Always check the skills directory and pick the best relevant skills before you start coding, debugging, or even general look up. You can use the /find-skills skills to get the right skills to use.

Git identity
Do not put cursor, Cursor, cursoragent, or any similar vendor name in branch names, commit messages, co-author trailers, tags, or PR titles.

Never create a branch with "codex/..." or write a commit with that prefix. Instead use standard conventions to create branches with intent like "feat/...", "fix/...", "refactor/...", "test/..." and so on.

Use conventional branch names (feat/..., fix/...). Author commits as the repository owner. Do not add vendor co-authors.

Code formatting
For every coding task, use Prettier on every modified file type that Prettier supports. Respect the repository's pinned Prettier version, configuration, ignore rules, and existing formatter scripts; prefer the repository's formatter command when one exists.

Before finishing a coding task, run Prettier on the supported files changed during the task and verify that its formatting check passes. Do not format generated, vendored, or ignored files. For languages Prettier does not support, use the formatter already configured by the repository.

Do not add or upgrade Prettier, plugins, dependencies, or formatting configuration unless the user requests it or the task explicitly requires it. If Prettier is unavailable, report that clearly instead of claiming formatting was verified.
