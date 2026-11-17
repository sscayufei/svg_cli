# @svgframe/command-stats

独立 query 命令插件，通过 core 的 CommandDefinition 注册 `stats`，包内仅依赖 @svgframe/core。

`stats` 不接受参数，未建立文档时沿用 no document 错误。从画布孩子按当前顺序 DFS，使用 isContainer 区分容器，容器仅计 containers；所有内部叶子按语义类型计数，顺序为类型首次出现顺序，根 SVG 不计。

```text
rect: 3  circle: 1  text: 2  (total 6, containers 2)
(total 0, containers 0)
```

各项之间两个空格，输出通过通用 lines 结果交给宿主。命令不修改文档/来源、双栈/屏障或观察者状态；不直接访问 IO，不消费 options。

默认导出 StatsPlugin 类，activate 仅需要 session 和 commands。代码装配在顶层 composition；配置条目为 `{ "module": "@svgframe/command-stats" }`。清单声明 contributes.commands 为 stats，仍由共同 installer 校验。

从仓库根运行：

```powershell
npm.cmd run build
npm.cmd test --workspace @svgframe/command-stats
node dist/host/main.js
node dist/host/main.js --config doc/transcript/inputs/stats.plugins.json
```

根 plugins.config.json 与默认代码装配均启用 stats、dir；显式空配置 test/fixtures/entries/no-optional.json 可禁用全部可选插件。包独立测试使用公开 SvgNode/SvgGroup 和复合替身，不 import 内置形状、命令、host 或 box。
