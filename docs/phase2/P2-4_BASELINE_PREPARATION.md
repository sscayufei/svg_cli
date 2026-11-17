# P2-4 前置：统一装配与演示基线 F

日期：2026-11-17。开始时工作区干净，HEAD 为 `8dc8e39174e1953550f46de3a34c3ac0e5c0e291`（dir 接入）。状态：独立准备变更及本地验收完成，待用户提交成为 F；本轮不是 box 接入实现，未产生 F、C_A 或 C_B。

## 为什么单独准备

[开发计划 §10](DEVELOPMENT_PLAN.md) 明确要求进入 P2-4 前，单独准备 stats/dir 一致装配与演示基线 F；[验收规则 §4](ACCEPTANCE.md) 要求 box 的 C_A、C_B 都以 F 为唯一父提交。原 HEAD 的代码方式已启用 stats、dir，但根配置为空，不能直接作为一致的演示起点。

因此本轮只完成配置和测试/文档准备。8dc8e39 是本轮父提交，框架冻结提交仍为1ff4352；准备变更实际提交后的 SHA 才是 F。不能把尚不存在的提交或 dir 提交直接写成已验证的 F。

## 已完成变更

- 根 plugins.config.json 按 stats、dir 顺序声明两个现有模块，options 均缺省，与代码装配一致；未增加 box 项。
- 无扩展验收统一使用固定的 test/fixtures/entries/no-optional.json；原 stats 缺省测试只更换配置路径，十九命令/unknown command 等原断言不变。
- 新增 commands-root-config 回放 plan，使用真实根配置，两个入口都为 dist/host/main.js，复用已有联合会话与固定目录 seed。
- 增加公共命令基线回归：集合前缀/顺序/options、真实命令类及 help、根配置两路 raw 流和目录内容、显式空配置禁用。测试锁定共同的 stats/dir 前缀，允许后续 box 在一个演示分支独立追加；它不冒充 box 的集合一致性验证。
- 同步根 README、插件 README 和正式说明；没有修改任何生产源码、插件测试/manifest、依赖或构建脚本。

dir 实际接入核验已补齐：`verify:plugin-diff -- 92cde9f 8dc8e39 --plugin plugins/command-dir --mode code` 返回39个变更、零违反项，见 [提交差异证据](../../doc/evidence/phase2/p2-3b-committed-diff.json)。stats 的92cde9f接入证明继续保留。

## 实际验证

| 验证 | 结果 |
|---|---|
| npm.cmd run build | 全部 CLI 工作区和宿主构建通过，无新增依赖 |
| npm.cmd run check:tests | 全部主测试源码严格类型检查通过 |
| npm.cmd test | 39 文件 / 323 项通过，比 P2-3b 增加4项 |
| commands-root-config plan | 真实根配置与代码方式的两路 raw stdout/stderr 一致，列目录内 fixture 字节一致 |
| 现有 stats-only / commands fixture plan | 完整测试中继续通过，原语义和错误预期未修改 |
| verify:baseline（no-optional wrapper） | 根配置启用命令后，独立空配置仍使三份会话与 final 原始字节一致 |
| 运行边界检查 | src、scripts、root package/lock、四插件 src/test/manifest/tsconfig 相对8dc8e39均无差异 |

证据：[检查摘要](../../doc/evidence/phase2/p2-4-prep-checks.json)、[A/B 摘要](../../doc/evidence/phase2/p2-4-prep-assemblies.json)、[无扩展基线](../../doc/evidence/phase2/p2-4-prep-baseline.json)、[准备边界](../../doc/evidence/phase2/p2-4-prep-boundary.json)。raw 目录为 `.tmp/phase2/assemblies-YP1o5O` 和 `.tmp/phase2/baseline-Qt1tX1`。未重跑未改动的 VSCode/GUI/VSIX，未用未提交工作区生成历史指标。

## 提交后如何使用 F

建议本轮普通提交说明：`chore(phase2): prepare shared box demonstration baseline`。按照开发计划 §2，项目提交默认由用户审阅执行；本轮未 git add/commit/push/tag，也未创建演示分支。

本轮提交后执行只读核对，并把完整 SHA 记录为 F：

```powershell
git rev-parse HEAD
git log -1 --format="%H %P %s"
git status --short
```

确认该提交包含本轮根配置和准备测试，父提交为8dc8e39，工作区干净。完整记录后再进入 box 实现，避免接入提交混入这次根配置同步。

## P2-4 的后续开发与证明约束

1. 在共同 F 上开发 shape-box 包，包含 provider、复合类型、fill/label 处理器和类型标签。插件只依赖公开 core 与基础构建端口，按既定模板/保护/恢复/降级语义实现。
2. A 演示提交 C_A 的唯一父提交为 F；已有运行改动只允许 src/host/composition.ts，追加 box 代码对象。B 演示提交 C_B 的唯一父提交也为 F；新增相同包，既有运行源码不改，只追加根配置项。
3. 包源文件/清单/必要元数据在两个演示中保持相同；根 package 仅改依赖字段，禁止夹带 scripts 逻辑。测试和文档按范围说明；冻结差异工具不允许根 README 出现在插件接入提交中，新增用法写在插件 README、doc 或 docs。
4. A/B 使用相同基础 stats/dir 集合、Box 实现、顺序/options、输入和同一个 cwd，均直接 node 启动；日志和保存目标按回放约定处理。当前共同命令测试不能替代 Box 行为及 A/B 全集合核对。
5. 在相应分支/工作区编译并执行全部相关测试，再核验真实提交。示例中的 F/C_A/C_B 必须替换为真实 SHA：

```powershell
npm.cmd run verify:plugin-diff -- F C_A --plugin plugins/shape-box --mode code --peer C_B
npm.cmd run verify:plugin-diff -- F C_B --plugin plugins/shape-box --mode config --peer C_A
```

两份证明提交需保持可达，最终整合提交不替代它们。分支/提交操作按当时用户授权执行，不自行重写历史。若发现必须修改冻结框架，先单独修正并重新记录基线，再做干净接入。

## 当前范围

F 候选准备已完成。box 实现、C_A/C_B、业务测试与对应接入证据仍待下一步；P2-4 的完整退出条件尚未满足。这里没有把准备工作标为 box 接入完成。
