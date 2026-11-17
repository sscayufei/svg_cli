# P2-4：box、属性与类型标签双装配接入

日期：2026-11-17。状态：实现、独立验证及两份真实本地接入证明完成；当前主工作区整合变更待用户审阅提交。下一阶段为 P2-5 modified-star。

## 共同基线与真实提交

框架冻结仍为 `1ff4352de83ac64943f36c9d51684101249fa1f6`。已核对用户提交的共同演示基线 F：`f5236b500194d129345479799d149e22d18acb52`，标题 `chore(phase2): prepare shared box demonstration baseline`，父提交为 dir 接入 `8dc8e39174e1953550f46de3a34c3ac0e5c0e291`。F 的代码和根配置均按 stats、dir 顺序装配。

用户明确授权创建两个本地证明分支、隔离工作区，并各提交一次；据此产生：

| 证明 | 分支 | 提交（唯一父提交均为 F） | 既有运行代码/配置的接入改动 |
|---|---|---|---|
| C_A | phase2/box-a-f5236b5 | f20745a82f12765a95b415b12893f8605cb52a4d | 仅 src/host/composition.ts 追加 BoxPlugin；根配置保留 F |
| C_B | phase2/box-b-f5236b5 | 9a8aeb65f21f14abd807c4e1c2f27dad40d0519a | 仅根 plugins.config.json 追加 box；所有既有运行源码保留 F |

隔离工作区分别为 `.tmp/phase2/box-proof/A`、`.tmp/phase2/box-proof/B`。两个分支保留可达，均含相同的完整 shape-box 包（包括测试、清单和 README）。每份接入共24个变更路径：新增插件包、根依赖/锁文件、必要测试/会话与各自唯一装配入口。package.json 只增加本地依赖，不改 scripts；没有新增第三方依赖。

主工作区 HEAD 仍为 F，没有提交当前整合内容。它采用 C_A 的 composition、C_B 的根配置及相同插件包，另补最终报告/ADR/证据；这份工作区同时支持两种装配，不能替代任一独立接入证明。未 push、未打 tag、未合并或重写历史。[提交与包校验](../../doc/evidence/phase2/p2-4-proof.json)记录完整 SHA、包文件哈希和保护路径。

## 实现与架构边界

新增 [@svgframe/shape-box](../../plugins/shape-box/README.md)，只依赖公开 core。清单声明 shape `box`、属性处理器 `box-fill`/`box-label`、装饰器 `box-type-label`，不增加命令。BoxPlugin 通过现有安装器注册，基础 rect/text 由 ShapeConstructionPort 请求，不导入 builtin-shapes。

BoxShape 继承公开 SvgGroup：语义为 box、树基础标题为 g、XML 为带 `data-kind="box"` 的 g。模板一次离线组装直接孩子 `<id>-rect` 和 `<id>-label`；矩形默认 `#4a90d9`，文本固定 x+20/y+35，允许零宽高和空标题。没有按尺寸自适应居中。允许额外孩子、普通组与嵌套 box；move/scale/delete/group/addto 可作用于整体。必要部件可以普通编辑和同父调序，直接删除或移出、被 group 收编会拒绝；box 自身 ungroup 包括根级情形均拒绝。

BoxFillHandler 通过 AttributeEdits 只修改本 box 的矩形，BoxLabelHandler 只修改本 box 的文本；不会递归传播到嵌套 box，也不写根 g 的 fill。每条 set 是一个可逆历史单元，redo 重放既有记录。反馈保留空字符串、转义和属性缺席；fill 撤销的缺席显示 `(unset)`。未安装处理器时，容器 fill/stroke/stroke-width 走原规则，label 仍是未知属性。

完整 restore 接收已恢复的离线孩子，检查必要部件的直接归属、派生 ID、类型及叶子身份，保留合法组样式和额外孩子。缺失/损坏拒绝整次 read；旧 fromAttributes 没有子树，明确拒绝制造不完整 box。未安装 provider 时使用冻结的通用 g 降级并移除标记；重复 ID 在降级前仍拒绝。读取失败不替换文档、来源或历史。

BoxTypeDecorator 仅向 box 行追加 `(box)`，不标普通 g 或 SVG 根。与假星号装饰器的顺序组合已验证；正式 dirty 状态机尚未实现，属于 P2-5。

core、loader、IO、CLI、XML、bootstrap/main、构建/验证脚本、内置包、stats/dir 和 VSCode 扩展均未修改。现有公开契约足以完成接入，无需调整冻结架构。实际调用点已补入 [ADR 001](../../doc/adr/001-attribute-transactions.md)、[ADR 002](../../doc/adr/002-composite-restore.md)、[ADR 003](../../doc/adr/003-lifecycle-and-labels.md) 和 [扩展点清单](../../doc/EXTENSION_POINTS.md)。

## 验证与证据

| 验证 | 实际结果 |
|---|---|
| 主工作区 build / check:tests | 通过；冻结脚本自动发现新 workspace |
| 主工作区全量测试（最终整合装配） | 41文件 / 365项通过；新增27项单包、15项真实集成 |
| shape-box 独立包测试 | 27项通过；仅 core public、基础构建替身与测试命令 |
| A、B 隔离工作区各自离线 npm ci / build / check:tests | 均通过；各自使用独立产物和依赖目录 |
| A、B 各自全量测试 | 均41文件 / 365项通过，串行执行 npm.cmd test -- --maxWorkers=4 |
| F→C_A、F→C_B 真实差异 + peer 包比较 | 每份24路径、零违反项；唯一父提交 F，包内容一致 |
| 真实 C_A main 与 C_B main + 根配置回放 | stdout、stderr、flowchart-box.svg、roundtrip-box.svg 均逐字节相同 |
| 无可选插件 final 回放 | 3份会话原始字节一致，入口 no-optional.mjs |

首次并行运行两个工作区全套测试时，各有一项既有 workspace-discovery 烟测超过5秒，其他364项通过。判断为并行资源竞争后，保持实现和超时配置不变，串行限制 worker 重跑，两边全绿。两份验证日志保留首次失败及成功重跑，不将初次结果写成全通过。旧 cli.m2/cli.m5 的不支持 box 断言保持不变，仅把启动配置明确为无可选插件，避免默认 A 增加 box 改变测试条件。

集成覆盖真实基础节点/命令、全子树 ID 冲突、必要部件保护、整体操作及精确 undo/redo、嵌套/附加孩子/内部普通编辑/调序、stats、SVG 转义/往返/降级/损坏拒绝、多命中冲突与两部件局部修改后抛错恢复，检查文档/来源/双栈并实际 undo/redo。

讲义 Phase 1 §6.1 B 输入及手工预期保存在 [cli-2-box.txt](../../doc/transcript/cli-2-box.txt) 和 expected 文件中；扩展会话增加 stats、空 label、失败保护、读回和转义。树缩进和 line stroke 使用现有规范输出，不照抄示意排版。通用 [box plan](../../doc/transcript/plans/box.json) 使用显式三插件 A 测试入口，使两份证明提交均可跑同一功能集；它与真实提交入口证明分别记录。

真实跨工作区回放 plan 为 `.tmp/phase2/box-proof/actual-plan.json`，直接启动 A/dist/host/main.js 和 B/dist/host/main.js + B/plugins.config.json，在同一临时 cwd 顺序运行。raw 结果为 `.tmp/phase2/assemblies-jZCFyR`；final raw 结果为 `.tmp/phase2/baseline-fMOYQz`。摘要、哈希、真实调用路径和构建/测试日志保存于：

- [总检查](../../doc/evidence/phase2/p2-4-checks.json)、[A验证日志](../../doc/evidence/phase2/p2-4-a-verification.json)、[B验证日志](../../doc/evidence/phase2/p2-4-b-verification.json)
- [A提交差异](../../doc/evidence/phase2/p2-4-code-diff.json)、[B提交差异](../../doc/evidence/phase2/p2-4-config-diff.json)
- [跨工作区字节回放](../../doc/evidence/phase2/p2-4-assemblies.json)、[无扩展基线](../../doc/evidence/phase2/p2-4-baseline.json)

可复核真实提交：

```powershell
npm.cmd run verify:plugin-diff -- f5236b5 phase2/box-a-f5236b5 --plugin plugins/shape-box --mode code --peer phase2/box-b-f5236b5
npm.cmd run verify:plugin-diff -- f5236b5 phase2/box-b-f5236b5 --plugin plugins/shape-box --mode config --peer phase2/box-a-f5236b5
```

没有重跑未修改的 VSCode/Extension Host/VSIX 或生成新的 GUI 截图；未宣称完成 P2-6 的最终可视化交付、远端同步或 p2 标签。

## 实际历史指标与后续

冻结 metrics 工具分别读取 F→C_A、F→C_B 的真实 Git blobs：[A指标](../metrics/box-code-integration.md) / [JSON](../metrics/box-code-integration.json)、[B指标](../metrics/box-config-integration.md) / [JSON](../metrics/box-config-integration.json)。core 代码行/复杂度均不变；A host 增2代码行，B host 不变；两者插件增7个生产文件、102代码行、函数复杂度增48。CLI 总代码行分别2928→3032和2928→3030。此为插件接入指标，不是最终 final→p2 指标，也不包含主工作区未提交文档。

P2-4 的本地功能及真实双提交退出条件已满足。建议主工作区整合提交：`feat(phase2): integrate box assemblies and record P2-4 evidence`，由用户审阅提交；保留两份证明分支可达。下一阶段 P2-5 新增独立 tree-star，使用现有只读快照/生命周期比较内容并传播祖先变化，注册在 box-type-label 之后；不得修改现有 box 包、core 或渲染器。正式双标签状态机与对应 A/B/差异证明在该阶段完成。
