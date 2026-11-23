# 源码指标

交付的源码快照为 [phase2-source.md](phase2-source.md) / [JSON](phase2-source.json)，于2026-11-23由脚本读取真实final提交与收尾前HEAD `474bedee351f42b2124b0e7730fe44787a25aabb` 生成。该提交与原运行源码提交`360fac0c68711a954d27213989fb735eeaec5adc`在指标统计范围内没有差异，本轮重算数值一致。它不包含未提交改动；环境、测试及结论见 [项目报告](../../doc/README.md) 第8节。开发期间的中间指标已移入本地过程归档。

指标文件作为收尾提交的一部分，记录的是提交前的真实源码采样版本，不能把其SHA手工替换成包含该文件的未来提交。创建最终`p2`标签后，按下节命令只读重算`final p2`，核对统计范围内源码和完整测量结果一致；原始结果仅在`.tmp/`保留，不为回填提交SHA移动既有标签。如果收尾期间修改了生产源码，应在打最终标签前重新采样、验证和提交。

## 生成与更新

在仓库根目录、安装依赖后执行，BEFORE和AFTER替换为真实revision：

```powershell
npm.cmd run metrics -- BEFORE AFTER --output .tmp/verification/comparison
```

例如以 `final HEAD` 代替起止版本。确认用于报告的源码版本后，可将output设为 `docs/metrics/phase2-source` 更新最终JSON/Markdown；不要手改生成数字或用工作区估算冒充Git历史。输出包括完整SHA、工具版本、文件职责、物理/代码行、逐函数复杂度、顶层分支与分类增量。

本轮生成命令为：

```powershell
node scripts/metrics.mjs final HEAD --output docs/metrics/phase2-source
```

最终`p2`标签创建后执行：

```powershell
npm.cmd run metrics -- final p2 --output .tmp/verification/final-p2
git diff --exit-code 474bedee351f42b2124b0e7730fe44787a25aabb p2 -- src plugins extensions/vscode-svg/src
```

Git差异应为空且退出码为0；重算JSON的`baseline/current`内`totals`与`files`及`delta`应分别与交付快照一致。`current.revision`和`current.sha`应指向最终`p2`，与采样快照的提交说明区别记录。此处是标签创建后的验收步骤，不表示尚未创建的标签已经通过检查。

## 计数范围与口径

- core：原架构的domain/application，新架构的src/core。
- host：原cli/infrastructure，新架构的src/host。
- plugins：plugins中的生产TypeScript；CLI总量合计前三类。
- VSCode：extensions/vscode-svg/src单列，不混入CLI增量。
- 排除test/tests/fixtures/dist/node_modules、声明产物、脚本和非生产源码。

规则为scripts/metrics-rules.json，实现为scripts/lib/source-metrics.mjs，使用固定TypeScript AST/scanner。换行统一LF，末尾换行不多计一行；代码行按非空非注释token标记，保护字符串/正则/template，不用正则盲删注释。

每个有函数体的函数基础复杂度为1；if、循环、非default case、catch、条件表达式、逻辑运算及逻辑赋值增加1；嵌套函数分开，顶层基础0，else/default/try/可选链不额外加值。这是本项目明确口径，不声称与其他工具完全一致。

内置命令和形状迁到独立插件会重新分配分类数字，应同时看CLI总量，不能把移动文件当成功能净删除或整体复杂度降低。最终标签与指标所记录源码不同时，应先检查生产源码是否相同并重算，而不是只改SHA文字。
