# 扩展点清单（P2-2a 初版）

更新日期：2026-11-17。本清单对应当前代码，不代表 P2-2b 的事务/复合模型或 P2-2c 的配置安装事务已经完成；接口尚未冻结。插件只导入 `@svgframe/core` 的公开出口，禁止导入 core 内部路径、host 或其他插件。

## 接口、调用位置与缺省行为

| 扩展点 | 核心接口及职责 | 当前实际调用点 | 当前实现 | 缺省/禁用 | 契约错误 |
|---|---|---|---|---|---|
| ShapeProvider | core/extensions/Contracts.ts；创建离线节点、按属性恢复、提供 help 与可选创建反馈 | core/application/ShapeFactory.ts：create、fromAttributes、creationFeedback、help；CreateCommand 与 SvgReader 调用服务 | builtin-shapes 中 Rect/Circle/Ellipse/Line/Text/GroupProvider，均为类实例 | 空注册表创建未知类型报错；默认宿主先安装六种 provider | 重复名拒绝；必需方法缺失报 invalid registration contract；返回非 SvgNode、错误 ID/type 或已挂接节点报 invalid shape provider result |
| Command | core/application/commands/Command.ts：执行协议；Contracts.ts 的 CommandDefinition 提供命令名、语法、help 和 build | host/cli/CommandDispatcher.ts：parse；core/application/CommandExecutor.ts：execute | builtin-commands 中十九个具体 Command，由 BuiltinCommandDefinition 类注册 | 空表输出 unknown command；默认装配保留原十九条命令与顺序 | 重复/缺 build 拒绝；无有效 execute/kind 报 invalid command definition result；edit 缺 undo/redo 在执行前拒绝 |
| AttributeHandler | Contracts.ts：纯 handles、计划 ChangeSet、可选预生成 applied/undone 反馈 | core/application/AttributeService.ts：resolve/plan；SetAttributeCommand.plan 调用 | 本阶段使用 test/extensions/contracts.test.ts 的 ProbeHandler；正式 box 处理器在 P2-4 | 无匹配时调用 SvgNode.planSetAttribute，保留原白名单 | 多匹配报 attribute handler conflict；无效 ChangeSet 报 invalid attribute handler result；计划抛错直接传播，不转默认规则 |
| TreeDecorator | Contracts.ts：读取只读 TreeRow，返回可选后缀 | core/application/SceneQuery.ts：tree/suffixes；NodeFormatter.tree 拼接通用 suffixes | 本阶段使用 ProbeDecorator 测试类；正式标签在 P2-4/P2-5 | 空表后缀为空，tree 与 final 字节不变 | 重复/缺 decorate 拒绝；非字符串或换行后缀报 invalid tree decorator result；异常使本次查询失败 |

上表文件路径省略仓库前缀：core = src/core；host = src/host；插件 = plugins/包名/src。ShapeProvider 等的共同注册实现为 core/extensions/ExtensionRegistry.ts：register/get/values；每类独立名称空间，保留注册顺序。语法规则与错误在插件内定义，分发器不枚举十九个命令名；ShapeFactory 不枚举六种图形名。

生产默认装配在 host/composition.ts：createDefaultContext。先注册 BuiltinShapesPlugin，再注册 BuiltinCommandsPlugin，最后 main 构造 REPL。createPluginContext 返回完全空的核心扩展上下文，不偷偷装默认实现。这里是临时代码装配路径；配置加载和 A/B 共用的失败回滚安装路径在 P2-2c 实现，不能把当前直接 activate 当成最终的安装契约。

## 公共 API 与结果协议

`src/core/package.json` 仅导出包根；`public.ts` 导出领域 Component/容器/ChangeSet/GeometryState、会话/历史/查询/工厂服务、IO 端口、可逆命令基类和扩展接口。`internal/TreeAccess` 未公开。五类具体叶子与其 provider 在 builtin-shapes；具体命令与参数/help 表在 builtin-commands。

ShapeFactory 现在是应用层注册服务：它需要扩展元数据、帮助与反馈，故从原 domain 移至 core/application；domain 保持不依赖 application、host、插件、Node 或 XML。SvgGroup 保留为可复用的公开容器基类；g 的 create/read 接入仍由 GroupProvider 注册。

CommandResult 新增 `{ kind:'lines', lines:readonly string[] }`。创建 provider 可提供 creationFeedback；属性 handler 可提供 OperationFeedback（applied/undone），redo 重用 applied。反馈在修改文档前生成并由 OutputLines 校验/复制冻结；缺省仍使用原结果格式，不改变 Phase 1 输出。虚拟属性或传播属性应提供领域反馈，不能指望从容器自身字段读到内部部件值。

ReversibleCommand 是公开结构协议，CommandExecutor/History 不依赖具体 EditCommand 的 instanceof；插件可使用公开基类，也可自行实现协议。成功 edit 才记历史；query、失败命令和原文档类边界保持原行为。

NodeSnapshot 区分 semanticType/displayType/isContainer，空容器也有容器身份；tree 根行与节点行均可获得装饰上下文。只渲染子树时不为不可见的 SVG 根调用 decorator。多个后缀按注册顺序以单空格连接。

## 当前边界与下一阶段

AttributeHandler 当前是**纯计划契约**：plan 不得直接修改节点，返回原子 ChangeSet。它还不是允许任意受控多步修改的事务门面；部分修改后抛错、复合部件保护、文档生命周期通知与完整 XML 描述协议由 P2-2b 补齐。P2-2a 测试不将缺失能力写成通过。

注册器当前验证名称、重复名和必需方法；manifest 集合匹配、options、激活事务与订阅回滚属于 P2-2c。没有实现 stats/dir/box/star，也没有宣称新增插件零核心修改证明或框架冻结。

可核验测试：test/extensions/contracts.test.ts 覆盖四扩展点的注册/调用/缺省、冲突、错误、动态帮助、根/子树标签、通用反馈和可逆协议；两个插件包 test 目录各有独立测试，命令包使用形状服务替身。架构测试使用 TypeScript 7 原生 AST 快照扫描 import/re-export/require/dynamic import，覆盖 core、host、生产插件及 VSCode src，排除构建产物/测试，并检查 private symbols 与 package exports。
