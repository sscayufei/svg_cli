# 扩展点与公开服务参考

本清单描述当前接口、调用位置、实现与缺省行为。设计背景和本轮测试填写位置见 [项目报告](README.md)，操作方法见 [用户指南](../README.md)。插件仅导入 `@svgframe/core` 公开包根。

## 接口、调用位置与缺省行为

| 扩展点 | 核心接口及职责 | 当前实际调用点 | 当前实现 | 缺省/禁用 | 契约错误 |
|---|---|---|---|---|---|
| ShapeProvider | core/extensions/Contracts.ts；创建离线节点、恢复完整子树、提供 help 与可选创建反馈 | core/application/ShapeFactory.ts：create、fromAttributes、restore、creationFeedback、help；CreateCommand 与 SvgReader 调用服务 | builtin-shapes 中六类 provider；shape-box/BoxShapeProvider | 空表创建未知类型报错；未知 g 的 data-kind 降级普通 g；内置六种，默认可选 box | 重复/缺必需方法拒绝；无效节点/身份/归属拒绝；已注册复合标记缺 restore 或结构损坏拒绝，不降级 |
| Command | core/application/commands/Command.ts：执行协议；Contracts.ts 的 CommandDefinition 提供命令名、语法、help 和 build | host/cli/CommandDispatcher.parse；core/application/CommandExecutor.execute；command-stats 的 Definition.build/Command.execute；command-dir/DirCommandDefinition.build、DirCommand.execute | builtin-commands 十九条；独立 StatsPlugin、DirPlugin 分别注册自己的 Definition/Command 类 | 内置十九条不变，默认 A 另启 stats、dir；可分别禁用，未装时 unknown command | 重复/缺 build 或无效 execute/kind 拒绝；多参数各报 usage；stats 无文档报错，dir 不依赖文档；dir 读失败 cannot read directory: path；query 不建历史 |
| AttributeHandler | Contracts.ts：纯 handles；apply 接收只读目标及 AttributeEdits，可返回 applied/undone 反馈 | core/application/AttributeService.ts：resolve/plan；EditTransaction；SetAttributeCommand.plan 调用 | shape-box/BoxFillHandler、BoxLabelHandler；另有框架测试替身 | 无匹配调用 SvgNode.planSetAttribute，保留原白名单 | 多匹配报 attribute handler conflict；操作/反馈/不变量失败逆序恢复，不转默认；门面关闭后报 transaction is closed |
| TreeDecorator | Contracts.ts：读取只读 TreeRow，返回可选后缀 | core/application/SceneQuery.ts：tree/suffixes；NodeFormatter.tree 拼接通用 suffixes | shape-box/BoxTypeDecorator；tree-star/ModifiedStarDecorator | 空表后缀为空，tree 与 final 字节不变；star可独立禁用，box标签保留 | 重复/缺 decorate 拒绝；非字符串或换行后缀报 invalid tree decorator result；异常使本次查询失败 |

上表文件路径省略仓库前缀：core = src/core；host = src/host；插件 = plugins/包名/src。ShapeProvider 等的共同注册实现为 core/extensions/ExtensionRegistry.ts：register/get/values；每类独立名称空间，保留注册顺序。语法规则与错误在插件内定义，分发器不枚举十九个命令名；ShapeFactory 不枚举六种图形名。

生产装配在 host/composition.ts：createApplication/createDefaultContext。默认 BuiltinShapesPlugin、BuiltinCommandsPlugin 及 A 可选列表均通过 PluginInstaller；B 经 PluginLoader 后也进入同一 installer。main/bootstrap 使用同一 REPL。createPluginContext 返回没有默认贡献的空注册上下文，另提供明确的目录/资源服务。

## 公共 API 与结果协议

`src/core/package.json` 仅导出包根；`public.ts` 导出领域 Component/容器/ChangeSet/GeometryState、会话/历史/查询/工厂服务、IO 端口、可逆命令基类和扩展接口。`internal/TreeAccess` 未公开。五类具体叶子与其 provider 在 builtin-shapes；具体命令与参数/help 表在 builtin-commands。

ShapeFactory 现在是应用层注册服务：它需要扩展元数据、帮助与反馈，故从原 domain 移至 core/application；domain 保持不依赖 application、host、插件、Node 或 XML。SvgGroup 保留为可复用的公开容器基类；g 的 create/read 接入仍由 GroupProvider 注册。

CommandResult 支持 `{ kind:'lines', lines:readonly string[] }`。创建 provider 可提供 creationFeedback，在挂接前生成；属性 handler 在事务内返回 OperationFeedback（applied/undone），提交前由 OutputLines 校验/复制冻结。redo 重用记录和 applied 反馈，不再次执行 handler。缺省仍使用原结果格式。虚拟属性或传播属性应提供领域反馈，不能指望从容器自身字段读到内部部件值。

ReversibleCommand 是公开结构协议，CommandExecutor/History 不依赖具体 EditCommand 的 instanceof；插件可使用公开基类，也可自行实现协议。成功 edit 才记历史；query、失败命令和原文档类边界保持原行为。

NodeSnapshot 区分 semanticType/displayType/isContainer，空容器也有容器身份；tree 根行与节点行均可获得装饰上下文。只渲染子树时不为不可见的 SVG 根调用 decorator。多个后缀按注册顺序以单空格连接。

## 事务、结构、XML 与通知的实际调用

| 公共能力 | 调用点 | 缺省与约束 |
|---|---|---|
| AttributeEdits.read / setAttribute | EditTransaction；AttributeService 单匹配分支 | 只读复制视图；即时记录原子属性修改；成功/失败后关闭，失败逆序恢复；不接受任意回调 |
| ChangeSet.fromApplied / applyChecked / revertChecked | EditTransaction、NodeEditCommand、CreateCommand、GroupCommand | 结果或完整性检查失败恢复原状态；命令自身状态和历史均在成功后推进 |
| ShapeConstructionPort.create | ShapeFactory 实现；复合 provider 可注入 | 缺基础 provider 明确失败；无需 import 具体图形包 |
| SubtreeBuilder.assemble | SvgGroup.initializeChildren | 仅空离线容器；预检 ID/父归属/嵌套结构/接收策略；失败恢复父引用 |
| SvgGroup.assertCanAccept / assertCanRelease | SvgDocument.insert / remove / validateRelocation；SceneEditor.planGroup | 默认允许；跨父迁移检查双侧，同父调序不检查 release；策略为纯检查 |
| SvgGroup.assertCanUngroup / verifyStructure | SceneEditor.planUngroup；构建/挂接/文档 verifyInvariants | 默认允许；插件提供完整性规则，解散策略优先于根级普通组错误 |
| SvgNode.describeSvg / SvgElementDescription | host/svg/SvgWriter.serialize | 缺省标签为 type、属性为普通属性，text 单独输出；统一转义，不许描述覆盖 ID |
| ShapeProvider.restore / ShapeRestoreInput | ShapeFactory.restore；SvgReader.buildCandidate | 完整离线孩子后序恢复；仅 g 的 data-kind 路由/静默降级；重复 ID 先全局拒绝 |
| EditorSession.snapshot / SceneQuery.scene | SessionEvents 的快照供应器，插件只读查询 | 完整冻结画布/根序列/节点/父子序列/几何/属性，来源单列，无 live node |
| SessionEvents.subscribe / Subscription.dispose | PluginContext.events；host/composition 绑定 session 与 history | 七类成功事件：init/read/save/canvas/edit/undo/redo；查询/失败无事件；释放幂等 |
| SessionEvents.diagnostics | publish 隔离每个观察者和快照异常 | 独立诊断值通道；不改变成功结果与 CLI 正常输出 |

通知在 CommandExecutor 成功处理文档屏障、CommandHistory 成功记栈/undo/redo 后发布。直接调用领域模型或命令 execute 不构成完整执行流程，应用/插件应通过执行器和绑定会话的 history 运行用例。自行装配时使用 `new CommandHistory(session.events)`；无参构造仍可用于不需通知的独立测试。观察者只更新自身缓存，不重入命令或修改模型。

属性事务及结构原子步骤依赖可信插件遵守同步、纯匹配/策略、原子 apply/revert 契约；不声称对恶意插件建立进程级隔离。自定义 ReversibleCommand 须自行满足同一失败原子协议。

## 设计边界

属性事务、复合保护、生命周期和完整XML描述均由通用契约提供。关键取舍见 [ADR001](adr/001-attribute-transactions.md)、[ADR002](adr/002-composite-restore.md)、[ADR003](adr/003-lifecycle-and-labels.md)。box与star通过这些公开契约接入；实际测试结论由作者填写在项目报告第8节。

tree-star 的 TreeStarPlugin.activate 从 session.snapshot 建立独立初始基线，通过 context.events 暂存订阅；ModifiedStarDecorator.observe 在 init/read/save 更新基线，在 edit/undo/redo/canvas 重算内容差异和祖先缓存，decorate只查缓存。新节点立即标星、回保存内容消星；删除/移出由旧父孩子序列体现，画布只标根；查询和失败不更新。默认安装顺序 box-type-label、modified-star，组合为 `(box) *`，两包互不依赖；安装失败和退出均由冻结安装器释放订阅。

box 的 shape/box 由 BoxShapeProvider.create/restore 提供；BoxShape.verifyStructure/assertCanRelease/assertCanUngroup 校验并保护直接 rect/text 部件，拒绝分别为 `invalid box structure: id`、`cannot remove required component: id`、`cannot ungroup composite shape: id`。属性 box-fill/box-label 的 apply 仅通过 AttributeEdits 修改本 box 的部件，无匹配时普通组样式回退、label 未知；已安装 provider 的损坏子树拒绝，缺 provider 静默降级 g。decorator/box-type-label 的 BoxTypeDecorator.decorate 只对 box 行返回 `(box)`，不标根。调用链仍为通用 ShapeFactory、AttributeService、SceneQuery 和 formatter。

## 安装、加载与外部端口

| 能力 | 公开契约与实际调用 | 缺省/错误 |
|---|---|---|
| 窄注册表 | ExtensionRegistrations；PluginContext 的四字段；StagedRegistry 暂存，ExtensionRegistry.registerBatch 提供宿主提交收据 | 名称/方法/help 校验，重复锁存；按完整类别回滚，不向插件上下文暴露恢复原语 |
| 插件与清单 | Plugin.activate、PluginManifest；PluginInstaller.install、PluginManifestReader | 无参类或实例；同步 void；四贡献缺省空集合；不匹配/抛错清理当前插件 |
| 作用域资源 | SessionEventSource.subscribe、ResourceOwner.add；PluginResources；应用退出 dispose | 提交前订阅休眠，失败释放，成功退出释放；清理异常独立诊断，无热卸载 |
| A/B 入口 | composition.optionalPlugins / createApplication；PluginConfiguration.read/parse；PluginLoader.load | 显式配置替换 A 可选列表；错误仅启内置；顺序加载，disabled 不解析 |
| 模块归属 | PluginModuleResolver.resolve/nativeResolve | Node ESM 条件；目录/包名/编译文件，清单不需 exports 子路径；顶层缺失与依赖求值失败区分 |
| 目录访问 | application/ports/DirectoryPort；host/filesystem/NodeDirectoryAdapter.read；PluginContext.directory；command-dir/DirCommand.execute | 未 init 可用；Adapter 保持 startup path/不跟随链接；DirCommand 过滤点项、分组字符串排序/两空格/空目录并规范失败；无模型/历史副作用 |

配置和错误说明见 [PLUGIN_LOADING.md](PLUGIN_LOADING.md)，边界决策见 [ADR004](adr/004-plugin-installation.md)、[ADR005](adr/005-public-api-and-host.md)。默认代码与根配置均为stats/dir/box/tree-star，独立空配置可禁用可选贡献。真实接入边界应通过实际Git提交和存在的路径核对，不以历史过程记录代替本轮结论。

可核验测试：test/extensions/contracts.test.ts 覆盖四扩展点；transactions.test.ts 覆盖事务、失败恢复和重试；composites.test.ts 覆盖离线构建/保护/完整恢复/降级；lifecycle.test.ts 覆盖只读快照、成功通知、释放、异常隔离和测试基线/假标签。内置及新增命令包均有独立测试。架构测试使用 TypeScript 7 原生 AST 扫描 import/re-export/require/dynamic import，覆盖 core、host、生产插件及 VSCode src，排除产物/测试，并检查内部符号与 package exports。

目录替身用例在plugins/command-dir/test，真实目录/链接、失败继续、无副作用和装配用例在test/integration/dir.test.ts；Adapter角色见 [项目报告](README.md) 第5节，结果在第8节填写。

test/loading覆盖注册、清单、提交/订阅恢复和解析失败分类；NodeDirectoryAdapter有真实/替身测试，tools/framework-tools检查A/B原始输出/生成物、未知workspace和真实Git fixture。架构扫描约束loading/filesystem不依赖具体插件；实际结果在项目报告中填写。
