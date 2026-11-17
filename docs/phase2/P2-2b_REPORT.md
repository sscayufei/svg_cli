# P2-2b：属性事务、复合容器与文档生命周期

日期：2026-11-17。前置提交 `dc27435645be3e85ddc19b946e13423ff38e7e73`（P2-2a），开始时工作区干净；final 仍为 `2054ec5667ad2e5f16b9b52ddd75a3435ed63c9d`。状态：已提交 4a4ed73；本阶段不冻结框架。下文保留执行时记录，后续见 [P2-2c_REPORT.md](P2-2c_REPORT.md)。

## 实现结果

属性扩展从纯计划升级为只读匹配加受控事务：handler 只能通过 AttributeEdits 读值/设置属性，成功或失败后门面关闭。多命中先拒绝，无命中保留默认规则；单命中抛错不回退。多个部件修改、反馈校验和完整性检查组成一个 set 撤销单元，失败逆序恢复，redo 重放已提交记录与反馈。

ChangeSet 增加已应用记录合并和检查失败的恢复；NodeEditCommand、CreateCommand、GroupCommand 将文档验证、结果生成与命令状态推进放进同一成功边界。execute/undo/redo 失败均不移动双栈、不意外丢弃已有 redo；局部记录仍保留对象身份，不复制整个文档。

SubtreeBuilder 提供完整离线子树组装；ShapeConstructionPort 支持复合 provider 请求基础节点并在单测注入替身。SvgGroup 的接收、释放、解散与完整性钩子由文档/SceneEditor 统一调用。必要部件的 delete/addto/group 无绕过路径，同父 front/back 可用；整个复合节点仍可移动、缩放、嵌套、分组和删除，并通过 undo/redo 恢复。

语义 type、树 displayType 与 describeSvg 分离。SvgReader 先全局检查 ID，再前序补 ID、后序恢复完整子树。已注册 data-kind 调用 provider.restore，损坏直接拒绝；未注册的 g 标记静默降级，保留子树与合法样式并移除标记。其他未知属性/标签与叶子内子元素仍严格拒绝。writer 统一校验和转义 XML 描述，禁止描述覆盖 ID。

EditorSession 提供复制冻结的完整场景；SessionEvents 在成功历史提交后通知 init/read/save/canvas/edit/undo/redo。查询与失败不通知，订阅可释放，观察者异常通过独立 diagnostics 隔离。测试观察者可以据此比较保存点并驱动假标签；正式 dirty/祖先传播算法仍在 P2-5。

## 接口与文件

| 类别 | 主要位置 |
|---|---|
| 属性事务 | core/application/AttributeService、EditTransaction；extensions/Contracts；SetAttributeCommand |
| 失败原子性 | core/domain/ChangeSet；NodeEditCommand；CreateCommand、GroupCommand |
| 子树/策略 | core/domain/SubtreeBuilder、SvgGroup、SvgDocument、SceneEditor；ports/ShapeConstructionPort |
| XML 适配 | SvgNode/SvgElementDescription；ShapeFactory.restore；host/svg/SvgReader、SvgWriter |
| 生命周期 | SceneSnapshot、SceneQuery、EditorSession、SessionEvents；History/Executor；四种文档命令、PluginContext/composition |
| 验证 | test/extensions/transactions、composites、lifecycle；fixtures/composite；原契约/包测试适配 |

路径中 core 为 src/core，具体命令在 plugins/builtin-commands/src。本阶段未新增第三方依赖、npm 脚本或正式业务插件，锁文件不变。

## 实际验证

| 命令 | 结果 |
|---|---|
| npm.cmd run build:all | core/两个内置包/host/独立 VSCode 扩展干净构建通过 |
| npm.cmd run build、npm.cmd run check:tests | 最终补充后构建及全部测试源码严格类型检查通过 |
| npm.cmd test | 30 文件 / 257 项通过，包含两个内置包独立测试与架构边界检查；相比 P2-2a 增加 25 项 |
| npm.cmd run test:extension:unit | 8 项通过 |
| npm.cmd run verify:baseline | 最终构建的三份会话 stdout/stderr/生成文件与 final 逐字节一致 |

Windows 沙箱对 Vitest、esbuild、Node 测试和基线 git 子进程返回 spawn EPERM，按授权重跑后通过；不是代码测试失败。未更改扩展源码和依赖，本阶段未重跑 GUI/真实 Extension Host 或 VSIX 安装；这些证据保留于 P2-1b/P2-2a，不把旧运行冒充本阶段运行。

证据：[基线摘要](../../doc/evidence/phase2/p2-2b-baseline.json)、[验证摘要](../../doc/evidence/phase2/p2-2b-checks.json)。原始最终回放目录为 `.tmp/phase2/baseline-fXtgyG`（被忽略），黄金会话和预期仍在 doc/transcript。摘要的 currentHead 是执行时前置提交，测试对象是其上的未提交工作区，不代表新增提交 SHA。

## 需求映射与检查修正

- A-01/A-02：零/单/多命中、多部件单单元、部分修改抛错、非法第二操作、非法反馈、不变量和结果失败；保留文档内容、ID 索引、归属/父引用、来源路径与双栈，已有 redo 可继续。
- S-01/S-02 的框架前置：仅用 FixtureComposite 测试，验证全子树冲突、结构保护、整体操作、完整读回与降级；真实 box 模板和具体输出待 P2-4。
- T-01/T-02 的框架前置：只读快照、事件、保存点测试观察者和假标签；正式星号/双标签/祖先传播待 P2-5。
- F-02/Q-02：final 字节兼容；完成正式 [ADR 001](../../doc/adr/001-attribute-transactions.md)、[002](../../doc/adr/002-composite-restore.md)、[003](../../doc/adr/003-lifecycle-and-labels.md) 与 [扩展点清单](../../doc/EXTENSION_POINTS.md)。

检查中修正：handler 不能直接接收可写节点或任意原子回调；反馈必须在提交前校验。结果生成错误不能留下已应用修改。离线构建也要检查嵌套结构与接收策略，并在失败时恢复孩子根的父引用。观察者异常不能把已写文件改判失败。读取改为后序后，显式保留叶子内子元素的拒绝，并继续前序生成缺 ID 警告。

原 SvgReader 拒绝 data-kind 的用例更新为拒绝 data-other，另以新测试验收计划明确要求的 data-kind 路由/降级；这是新增语义，不是删掉旧失败测试掩盖回归。全部既有普通 SVG 会话预期保持不变。

## 下一阶段与提交

P2-2b 退出条件已满足。P2-2c 将实现配置加载、manifest 校验、安装/订阅回滚、DirectoryPort/适配器、A/B 框架、指标工具及框架冻结。本阶段没有声称实现这些能力，也未提前实现 stats/dir/box/star 或零修改接入证明。

建议提交：`refactor(core): add transactional attributes and composite invariants`。本轮未 commit/push/tag；用户审阅提交后按计划进入 P2-2c。
