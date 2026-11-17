# Historical source metrics

Before: 1d1b64628860d619e24b561bc49b2eeb435c29cc

After: 360fac0c68711a954d27213989fb735eeaec5adc

Historical Git blobs only. Moving built-in commands/shapes into plugins redistributes categories; compare cliTotal too. VSCode is separate. This snapshot does not include uncommitted work.

| Category | Files before/after | Code lines before/after | Function complexity before/after | Top-level decisions before/after |
|---|---|---|---|---|
| core | 35/35 | 1321/1321 | 475/475 | 0/0 |
| host | 20/20 | 802/804 | 371/371 | 0/0 |
| plugins | 52/55 | 909/968 | 287/312 | 0/0 |
| vscode | 6/6 | 143/143 | 49/49 | 0/0 |
| cliTotal | 107/110 | 3032/3093 | 1133/1158 | 0/0 |

Rules: Each function with body starts at 1; if, for/for-in/for-of, while, do, non-default case, catch, ternary, &&, ||, ?? and logical assignments add 1. Nested functions are separate. Top-level decisions start at 0. else, default, try and optional chaining add 0.

Lines: Normalize CRLF/CR to LF; final newline adds no physical line; code lines have non-whitespace tokens, excluding comments/trivia. AST literal ranges protect string, regex and template content during scanning.

Tools: Node v24.14.0, TypeScript 7.0.2. File responsibilities, physical lines, per-function details and deltas are in the adjacent JSON.
