# 历史源码指标

入口：`npm.cmd run metrics -- BEFORE AFTER --output docs/metrics/name`。读取 Git tree/blob 并解析历史源码，不修改工作区源码、不 checkout、不创建提交。无效 revision 或缺少支持的 core/host 源码布局时失败。输出 JSON 和 Markdown，JSON 包含完整 SHA、文件清单/职责、物理行数、代码行数、函数复杂度、顶层分支和分类差值。

分类和口径保存在 scripts/metrics-rules.json，计数实现为 scripts/lib/source-metrics.mjs（TypeScript 7.0.2 native AST/scanner）：

- core：final 的 src/domain、src/application；新架构的 src/core。
- host：final 的 src/cli、src/infrastructure；新架构的 src/host。
- plugins：plugins 的生产 .ts；VSCode 的 src 单列。
- 排除 test/tests/fixtures/dist/node_modules、声明产物、脚本和非生产源码；CLI 总量合计前三类。

换行先统一为 LF，末尾换行不额外增加物理行；代码行按非空非注释 token 标记。AST 的字符串、正则及 template 片段保护扫描器，不用正则剥注释，避免把字符串中的 // 或多行 template 当注释。

每个有函数体的函数/方法/构造器/accessor/箭头基础值为 1；if、各种循环、非 default case、catch、三元表达式及 &&/||/?? 和对应逻辑赋值各加 1。嵌套函数独立统计，不计入外层；文件顶层基础为 0，else/default/try/可选链不额外加值。这是本项目固定口径，不声称等同其他复杂度工具。

`test/tools/framework-tools.test.ts` 用真实 AST 验证注释/字符串/正则/template、空文件、嵌套函数与顶层分支；历史指标调用与规则版本随报告保留。

首轮 [p2-2c-initial.md](p2-2c-initial.md) / [JSON](p2-2c-initial.json) 对比 final `2054ec5…` 与 P2-2b 已提交的 `4a4ed73…`。这不是尚未提交的 P2-2c 全量指标，也不是最终 p2 指标。内置命令/图形迁入插件会重新分配分类数字，必须一起看 cliTotal，不能把迁移当功能净删除。

P2-3a 开始时已确认框架冻结 SHA 为 `1ff4352de83ac64943f36c9d51684101249fa1f6`，生成 [framework-freeze.md](framework-freeze.md) / [JSON](framework-freeze.json)。该报告只包含冻结框架，不包含本轮未提交 stats；工具仍直接读取历史 Git blob。最终先确定运行源码终态 SHA，再产出报告提交，并在 final/p2 上重算验证运行源码一致。不得手改生成 JSON/Markdown 数字。
