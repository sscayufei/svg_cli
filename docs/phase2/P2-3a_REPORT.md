# P2-3a：stats 独立命令插件

日期：2026-11-17。开始时工作区干净，前置/框架冻结提交为 `1ff4352de83ac64943f36c9d51684101249fa1f6`。状态：已提交 `92cde9f057f3b46080b8750f20555ef94c7f83dd`；P2-3b 开始时已通过实际接入差异检查，见 [提交证据](../../doc/evidence/phase2/p2-3a-committed-diff.json)。下文保留本阶段执行时记录。

## 实现与行为

新增独立 workspace `plugins/command-stats`（@svgframe/command-stats），包含 StatsPlugin、StatsCommandDefinition、StatsCommand 三个类和 public 出口。插件仅依赖 core public，默认类通过共同 installer 安装，manifest 只声明 commands/stats。

StatsCommand 是 query，使用已有文档 Iterable 按孩子当前顺序 DFS；按 isContainer 区分容器，根 SVG 不在遍历内。叶子类型用 Map 保存首次出现顺序，不按名称排序，不把空容器误判为叶子，不枚举 g/复合图形名。所有内部叶子照常计数。各项之间两个空格，空文档输出 `(total 0, containers 0)`；未 init/read 沿用 no document，额外参数包括引号参数均报 usage: stats。

返回通用 lines，不直接打印或访问 IO，不消费 options。无写文档、路径、历史、通知或脏状态逻辑；查询成功与失败均不移动历史栈、不改变屏障。help 名称/规则/描述由插件元数据提供。

方式 A 仅在 composition 增加包导入与 optionalPlugins 项；方式 B 使用测试配置加载同一个包/默认类，两个方式均经冻结 installer。无 --config 时默认启用 stats；根 plugins.config.json 保持空列表，显式配置可禁用全部可选插件，符合后续 stats/dir 演示基线准备计划。

## 变更与边界

| 类别 | 实际变更 |
|---|---|
| 新插件 | plugins/command-stats 的 manifest/tsconfig/src/test/README |
| 唯一已有运行修改 | src/host/composition.ts：导入 StatsPlugin 并加入 A 列表 |
| 依赖元数据 | root package.dependencies 增加本地包；lock 增加其本地 workspace 链接/依赖，无新增第三方库 |
| 测试/会话 | 独立包测试；integration/stats；cli-2-stats、手工语义预期、A/B plan/config；禁用可选插件的 baseline wrapper |
| 文档 | 本报告、使用说明、扩展点及进度；框架冻结历史指标/证据 |

已对冻结提交执行保护路径差异检查：core、host/loading/filesystem/cli/svg/bootstrap/main、scripts、既有两插件、VSCode 均无差异；已有 host 修改只在 composition。root package 除 dependencies 外无字段变化。见 [工作区边界摘要](../../doc/evidence/phase2/p2-3a-boundary.json)。

冻结差异工具的文档白名单为 doc/、docs/ 及插件自身目录，不包含根 README；本轮用法更新集中于这些允许路径，未为更新根 README 而扩大冻结工具范围。最新进度以 docs/phase2 为入口。

原 Phase 1 精确十九命令 help 测试改为显式空配置启动，断言/黄金输出不变；因为默认 A 新增 stats，旧能力验收必须说明无可选扩展条件，不能把正确的 stats 条目删掉来迁就旧默认启动方式。

## 实际验证

| 命令/用例 | 结果 |
|---|---|
| npm.cmd install --offline --ignore-scripts --no-audit --no-fund | 增加一个本地 workspace 链接，lock 更新，无网络下载/第三方新增 |
| npm.cmd run build | 未改编排脚本即自动发现/拓扑构建新包及宿主，编译产物可运行 |
| npm.cmd run check:tests | 全部主测试源码严格类型检查通过 |
| npm.cmd test | 36 文件 / 300 项通过；比 P2-2c 增加14项 |
| npm.cmd test --workspace @svgframe/command-stats | 单包11项通过，不导入 host/其他插件 |
| verify:assemblies 的 stats plan | 同入口、同包/清单/类、同顺序/options/cwd；raw stdout/stderr 和 stats.svg 字节一致 |
| 三份 final 基线会话 | 使用既有 SVG_CLI_ENTRY 覆盖及显式空配置 wrapper，无扩展 stdout/stderr/生成文件逐字节一致 |
| npm.cmd run metrics -- final 1ff4352 --output docs/metrics/framework-freeze | 从真实 Git blob 生成冻结提交指标，补齐 P2-2c 收尾要求，不包含未提交 stats |

独立测试涵盖空文档/空普通组/空语义容器、复合内部叶子、三类型需求示例、DFS 和重排后的首次类型顺序、能力判定、无文档/参数错误、来源/对象身份/父归属/双栈/屏障/通知不变，并实际 undo/redo 检查栈仍可用。集成测试验证20条命令的动态 help、空配置/disabled 缺省、A/B 命令类相同及读写会话。

新语义预期按需求和原有命令反馈逐项计算后写入 [stdout](../../doc/transcript/expected/cli-2-stats.stdout.txt)/[stderr](../../doc/transcript/expected/cli-2-stats.stderr.txt)。语义检查允许去提示符，A/B 和 final 回放分别保持原始 Buffer 比较，不能互相替代。会话还验证重排改变类型顺序、删除/undo/redo、保存屏障和查询保留已有 redo。

证据：[验证摘要](../../doc/evidence/phase2/p2-3a-checks.json)、[A/B 摘要](../../doc/evidence/phase2/p2-3a-assemblies.json)、[无扩展 final 摘要](../../doc/evidence/phase2/p2-3a-baseline.json)、[冻结指标](../metrics/framework-freeze.md)。最终 raw 目录分别为 `.tmp/phase2/assemblies-Ju7Gx8` 和 `.tmp/phase2/baseline-OJLvno`（忽略产物，可按提交的 plan 重现）。

本阶段未改扩展或基础框架，未重跑 GUI/Extension Host、VSIX 或扩展单测；不把前阶段运行算成本次证据。子进程测试/基线在 Windows 沙箱限制下按授权执行。

## 需求映射、核验与后续

C-01/Q-01 已完成：独立包、准确统计/顺序、根排除、复合替身、help/禁用、历史无副作用、单包与双装配测试。F-02 无扩展 raw 兼容继续通过。G-01 目前只保留冻结 SHA 和工作区边界，接入提交须用户提交后补验，不宣称已有 C_A/C_B 或正式 box 接入证明。

检查中采纳/修正：按 isContainer 而非类型名或 children.length 计容器；使用 Map 保留 DFS 首次类型顺序；独立测试以公开复合替身代替导入真实业务插件；通过原有通用输出/装配/构建完成接入，没有发现必须修改冻结框架的缺口。

建议提交：`feat(plugin-stats): add ordered scene statistics`。本轮未 git add/commit/push/tag。提交后记录 stats 接入 SHA，并运行：

```powershell
npm.cmd run verify:plugin-diff -- 1ff4352de83ac64943f36c9d51684101249fa1f6 <stats-commit> --plugin plugins/command-stats --mode code
```

下一阶段 P2-3b：dir 独立插件；复用冻结 DirectoryPort/Adapter，不修改核心或既有 stats。根配置的 stats/dir 一致演示清单按计划在 box 接入前独立准备。
