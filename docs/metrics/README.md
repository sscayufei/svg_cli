# 历史源码指标

保留的最终源码快照为 [phase2-source.md](phase2-source.md) / [JSON](phase2-source.json)，由脚本读取真实final提交与 `360fac0c68711a954d27213989fb735eeaec5adc` 生成。它记录历史源码，不包含未提交改动，也不代表本轮人工测试已完成；验证与最终结论在 [项目报告](../../doc/README.md) 第8节填写。开发期间的中间指标已移入本地过程归档。

## 生成与更新

在仓库根目录、安装依赖后执行，BEFORE和AFTER替换为真实revision：

```powershell
npm.cmd run metrics -- BEFORE AFTER --output .tmp/verification/comparison
```

例如以 `final HEAD` 代替起止版本。确认用于报告的源码版本后，可将output设为 `docs/metrics/phase2-source` 更新最终JSON/Markdown；不要手改生成数字或用工作区估算冒充Git历史。输出包括完整SHA、工具版本、文件职责、物理/代码行、逐函数复杂度、顶层分支与分类增量。

## 计数范围与口径

- core：原架构的domain/application，新架构的src/core。
- host：原cli/infrastructure，新架构的src/host。
- plugins：plugins中的生产TypeScript；CLI总量合计前三类。
- VSCode：extensions/vscode-svg/src单列，不混入CLI增量。
- 排除test/tests/fixtures/dist/node_modules、声明产物、脚本和非生产源码。

规则为scripts/metrics-rules.json，实现为scripts/lib/source-metrics.mjs，使用固定TypeScript AST/scanner。换行统一LF，末尾换行不多计一行；代码行按非空非注释token标记，保护字符串/正则/template，不用正则盲删注释。

每个有函数体的函数基础复杂度为1；if、循环、非default case、catch、条件表达式、逻辑运算及逻辑赋值增加1；嵌套函数分开，顶层基础0，else/default/try/可选链不额外加值。这是本项目明确口径，不声称与其他工具完全一致。

内置命令和形状迁到独立插件会重新分配分类数字，应同时看CLI总量，不能把移动文件当成功能净删除或整体复杂度降低。最终标签与指标所记录源码不同时，应先检查生产源码是否相同并重算，而不是只改SHA文字。
