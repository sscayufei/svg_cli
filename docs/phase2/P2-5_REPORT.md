# P2-5：modified-star 与双标签状态机

日期：2026-11-17。状态：开发与本地验收完成，当前变更待用户审阅提交；实际接入 SHA、提交差异及历史指标在提交后补验。未自行创建项目提交、分支、标签或 push。下一阶段为 P2-6 综合验收与最终交付。

## 起点与变更边界

开始时工作区干净，HEAD=`1d1b64628860d619e24b561bc49b2eeb435c29cc`（P2-4 整合）。共同演示基线 F=f5236b5 和 box 证明 C_A=f20745a、C_B=9a8aeb6 已保留；它们证明 box，不冒充本次 tree-star 的提交证明。框架冻结仍为 `1ff4352de83ac64943f36c9d51684101249fa1f6`。

新增 [@svgframe/tree-star](../../plugins/tree-star/README.md)，只依赖 core public，清单只声明 decorators/modified-star。既有生产源码仅修改 `src/host/composition.ts`，在 BoxPlugin 后追加 TreeStarPlugin；根配置同顺序追加，根 package/lock 只增加本地 workspace 依赖。构建脚本自动发现新包，没有新增第三方依赖或工具升级。

core、CLI/树渲染器、XML/IO、loader、bootstrap/main、构建/验证脚本、所有既有插件（包括完整 shape-box 包）和 VSCode 扩展均未修改。公开快照与生命周期足以实现本阶段，无架构调整。[边界证据](../../doc/evidence/phase2/p2-5-boundary.json)记录未变路径、新包哈希、唯一既有源码改动及元数据校验；它明确是工作区核对，尚不是实际提交证明。

## 内容差异算法及实际落点

`plugins/tree-star/src/ModifiedStarDecorator.ts` 在每个实例中保存基线根签名、基线节点签名、当前 dirty ID 缓存和根状态。默认未初始化时无星；激活时读取当前会话内容作为初始干净基线，正常 CLI 在 init/read 前安装。没有模块级可变状态，不把基线写入模型或命令历史。

- init/read/save 成功事件重置基线并清星；另存也清星。失败操作没有通知，保持原基线、缓存、来源及双栈。
- edit/undo/redo/canvas 成功事件从完整只读快照重建比较。节点签名包含类型/语义/显示/容器身份、几何、显式属性（包括文本与属性缺席）、父 ID/类型和孩子序列；根签名包含画布尺寸和根序列。
- 属性和几何键排序比较，忽略键插入顺序、快照节点枚举顺序、文件路径、对象身份和历史位置。显式属性与缺席不同；判断依据是公开模型内容，不是序列化后可能省略的冗余表示。
- 新节点立即有星；编辑到原内容或 undo 回保存内容消星，redo 再次标记，分叉依据新内容重新比较。保存后历史屏障不会妨碍后续内容判断。
- 变化向当前祖先与 SVG 根传播；旧父容器的孩子序列体现删除/移出。迁移标旧父、新父及移动节点，未变化的后代不额外标记；同父调序只标父，根调序只标根；单纯画布尺寸变化只标根。

祖先传播使用迭代循环和已访问 ID 集合，无递归；每次比较遍历当前节点并对必要字段排序/编码，传播中每个 ID 至多加入一次。基线与缓存约为 O(节点数+字段数据)，不是整个文档的 undo 副本，也不是编辑计数。decorate 仅查缓存，tree/query 不更新状态；直接改领域模型并绕过执行器/历史通知不属于完整应用执行流程。

`TreeStarPlugin.activate` 为每次激活创建新装饰器，通过安装器管理的 context.events 暂存订阅；清单校验失败或应用退出自动释放。插件对象不保留跨激活会话状态。无热卸载需求，也没有为本插件增加框架状态字段。

## 两个标签与装配

box-type-label 在前、modified-star 在后，输出 `g#p (box) *`。两个装饰器互不调用、互不读对方缓存；star 不导入 box 或内置插件，即使只安装 star 也能标普通图形、普通 g 和 SVG 根。子树查询只装饰可见节点，不额外插入 SVG 根行。显式禁用 star 后 box 标签独立保留，显式空配置禁用全部可选贡献。

当前默认代码装配 A 和根配置 B 都是 stats、dir、box、tree-star。另提供 [star.plugins.json](../../doc/transcript/inputs/star.plugins.json)，最后一项通过插件目录路径加载 tree-star，覆盖需求中的目录接入形式；与 A 的集合、顺序和 options 相同。两路都经过冻结 installer。

[cli-2-star.txt](../../doc/transcript/cli-2-star.txt) 覆盖新建、保存、再编辑、undo/redo、失败保存、分叉、另存、画布变化、read、删除/恢复、stats、dir、init；stdout/stderr 预期在运行前手工编写。dir 在生成 SVG 前执行，初始目录固定，回放日志位于 cwd 外；两路生成物和整个 fixture 树同时比较。

## 实际验证

| 命令/验证 | 结果 |
|---|---|
| npm.cmd install --offline --ignore-scripts --no-audit --no-fund | 通过，仅增加1个本地 workspace 链接 |
| npm.cmd run build | 全部 CLI 包和宿主编译通过，未改构建工具 |
| npm.cmd run check:tests | 主测试及各插件测试严格类型检查通过 |
| npm.cmd test --workspace @svgframe/tree-star | 22项独立状态机测试通过，仅 core public 类型与合成场景 |
| npm.cmd test -- --maxWorkers=4 test/integration/tree-star.test.ts | 12项真实集成通过 |
| npm.cmd test -- --maxWorkers=4 | 43文件 / 399项通过，较 P2-4 新增34项 |
| npm.cmd run verify:assemblies -- doc/transcript/plans/star.json | raw stdout/stderr、两份SVG及完整fixture树逐字节一致 |
| SVG_CLI_ENTRY=no-optional.mjs 的 verify:baseline | 3份会话与 final 原始字节一致 |
| 工作区源码/元数据/既有插件边界 | 通过；没有修改 box/core/渲染器/loader |

独立测试覆盖各比较字段、属性缺席、键顺序/路径/身份无关、保存点、undo/redo/分叉、init/read/save、画布、删除/迁移/调序、实例隔离、2500层迭代祖先传播。真实集成使用实际形状/命令/文件IO，逐步比较星号、场景、来源、历史及对象身份，并实际 undo/redo；覆盖失败保存/读回/编辑/查询、dir 成功失败、同值设置、双标签/嵌套 box/子树查询、退出释放、安装失败时真实订阅未泄漏、star独立安装和禁用。

旧 M3/M4/M6/M7/smoke 的 Phase 1 测试启动时明确传入固定 no-optional.json，原断言不变；这是隔离默认新增标签的必要测试条件，不改旧产品语义。P2-4 的 box 会话仍使用显式 box-only 可选集合，原预期和测试全部保留。当前默认与根配置列表、贡献顺序均另有真实测试。

独立 Vitest 首次启动被 Windows 沙箱 spawn EPERM 拦截，按权限要求重跑通过；没有修改测试、超时或产品代码来绕过权限。最终测试用 maxWorkers=4 控制本机并发，不改默认 Vitest 配置。本阶段未重跑未改动的 VSCode单测、GUI/Extension Host 或 VSIX安装，也未制作新截图。

证据：[总检查](../../doc/evidence/phase2/p2-5-checks.json)、[实际命令日志](../../doc/evidence/phase2/p2-5-verification.json)、[A/B哈希](../../doc/evidence/phase2/p2-5-assemblies.json)、[final基线](../../doc/evidence/phase2/p2-5-baseline.json)、[边界与包哈希](../../doc/evidence/phase2/p2-5-boundary.json)、[最终链接/JSON/哈希/差异检查](../../doc/evidence/phase2/p2-5-final-check.json)。raw 目录为 `.tmp/phase2/assemblies-BmXlEb`、`.tmp/phase2/baseline-g4P7vD`。

## 审阅、提交与下一阶段

建议提交：`feat(plugin-tree-star): mark content changes since save`。用户审阅提交后记录完整 SHA，并以本阶段起点1d1b646为基线核验实际提交：只增加 tree-star、新装配/配置、必要依赖、测试和文档，所有既有插件与框架差异为空。当前同时集成 A/B，冻结 verify:plugin-diff 的单模式路径白名单只允许其中一个入口，不能拿一次会报另一入口越界的单模式结果宣称通过；实际整合提交须按本报告的两入口范围逐项核对。box 必需的两份独立同父证明已完成，不重建或替换它们。

遵循阶段提交约定，整合内容保留待用户审阅提交；工作区证据不替代提交证据，也没有从未提交源码伪造历史指标。P2-6 开始先核对用户的 tree-star 接入提交、补真实差异与历史指标，再开展全部工具链/宿主/VSIX/GUI/会话/远端交付核验和最终 p2 标签流程。正式 ADR 的算法与调用位置已更新至 [ADR003](../../doc/adr/003-lifecycle-and-labels.md)。
