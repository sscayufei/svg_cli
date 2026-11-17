# Historical source metrics

Before: f5236b500194d129345479799d149e22d18acb52

After: f20745a82f12765a95b415b12893f8605cb52a4d

Historical Git blobs only. Moving built-in commands/shapes into plugins redistributes categories; compare cliTotal too. VSCode is separate. This snapshot does not include uncommitted work.

| Category | Files before/after | Code lines before/after | Function complexity before/after | Top-level decisions before/after |
|---|---|---|---|---|
| core | 35/35 | 1321/1321 | 475/475 | 0/0 |
| host | 20/20 | 800/802 | 371/371 | 0/0 |
| plugins | 45/52 | 807/909 | 239/287 | 0/0 |
| vscode | 6/6 | 143/143 | 49/49 | 0/0 |
| cliTotal | 100/107 | 2928/3032 | 1085/1133 | 0/0 |

Rules: Each function with body starts at 1; if, for/for-in/for-of, while, do, non-default case, catch, ternary, &&, ||, ?? and logical assignments add 1. Nested functions are separate. Top-level decisions start at 0. else, default, try and optional chaining add 0.

Lines: Normalize CRLF/CR to LF; final newline adds no physical line; code lines have non-whitespace tokens, excluding comments/trivia. AST literal ranges protect string, regex and template content during scanning.

Tools: Node v24.14.0, TypeScript 7.0.2. File responsibilities, physical lines, per-function details and deltas are in the adjacent JSON.
