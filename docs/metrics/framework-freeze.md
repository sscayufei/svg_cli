# Historical source metrics

Before: 2054ec5667ad2e5f16b9b52ddd75a3435ed63c9d

After: 1ff4352de83ac64943f36c9d51684101249fa1f6

Historical Git blobs only. Moving built-in commands/shapes into plugins redistributes categories; compare cliTotal too. VSCode is separate. This snapshot does not include uncommitted work.

| Category | Files before/after | Code lines before/after | Function complexity before/after | Top-level decisions before/after |
|---|---|---|---|---|
| core | 45/35 | 1340/1321 | 445/475 | 0/0 |
| host | 11/20 | 596/793 | 238/371 | 0/0 |
| plugins | 0/37 | 0/725 | 0/214 | 0/0 |
| vscode | 0/6 | 0/143 | 0/49 | 0/0 |
| cliTotal | 56/92 | 1936/2839 | 683/1060 | 0/0 |

Rules: Each function with body starts at 1; if, for/for-in/for-of, while, do, non-default case, catch, ternary, &&, ||, ?? and logical assignments add 1. Nested functions are separate. Top-level decisions start at 0. else, default, try and optional chaining add 0.

Lines: Normalize CRLF/CR to LF; final newline adds no physical line; code lines have non-whitespace tokens, excluding comments/trivia. AST literal ranges protect string, regex and template content during scanning.

Tools: Node v24.14.0, TypeScript 7.0.2. File responsibilities, physical lines, per-function details and deltas are in the adjacent JSON.
