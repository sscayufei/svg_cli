# 原始回放基线与Phase 2完整验收

最终入口：`node scripts/verify-phase2-release.mjs`（先build），也可用`--source <干净构建目录>`。它用真实default A/root配置B回放六份四插件会话，原始stdout/stderr和目录内/外生成物逐字节一致；最终 `cli-2-star-release.txt` 在被列目录外保存和读回SVG，保留原star会话作过程回归。目录初始内容重置、日志位于cwd外，原始比较不去提示符/trim/改换行；手工预期语义检查是独立一层。各历史stats/commands/box/star plan继续由verify:assemblies回归。

禁用可选插件与final比较时，先把SVG_CLI_ENTRY设为`test/fixtures/entries/no-optional.mjs`再运行verify:baseline。仅源码快照不含Git根时，从实际仓库运行历史导出器，并把该变量设为干净构建目录的no-optional.mjs绝对路径。完整命令及证据见 [P2-6报告](../../docs/phase2/P2-6_REPORT.md)。以下保留最初的Phase1基线约定。

输入 TXT 仅含命令/注释，UTF-8、LF；不能粘贴 svg> 或输出。

- cli-1.txt：需求 §6 典型会话。
- cli-1-flowchart.txt：需求 §6.1 版本 A，由 examples/demo.cli 提取。
- cli-1-basics.txt：无文档、help、空树、引号/中文、常见错误和历史边界。
- inputs/other.svg：典型会话的固定读入文件。
- expected/：从 final 实际运行捕获的 stdout/stderr 原始黄金文件；后续新能力不能覆盖这些文件来掩盖回归。

运行：

```powershell
npm.cmd run build
npm.cmd run verify:baseline
# 可显式指定其他历史基线
npm.cmd run verify:baseline -- final
```

工具从 Git 导出历史 src/package/lock/tsconfig 到唯一临时目录，按历史锁安装依赖并构建。新旧 CLI 顺序运行在同一 cwd，每次重建相同初始文件；日志在 cwd 外。stdout/stderr 用 Buffer.equals，不剥离提示符、不 trim、不替换换行；输入文件和生成文件记录 SHA-256，并保留两侧原文件。

所有 cli-1*.txt 为兼容会话；后续 cli-2*.txt 不混入 final 对比。当前入口默认 dist/host/main.js，迁移后可通过 SVG_CLI_ENTRY 指定。运行目录/证据在 .tmp/phase2/baseline-*，不提交依赖和缓存；正式阶段报告保存结果摘要。
