# 扩展点清单（P2-3b）

更新日期：2026-11-17。框架冻结于 1ff4352；本清单覆盖事务/复合模型/生命周期/安装及独立 stats、dir。插件只导入 `@svgframe/core` 的公开出口，禁止导入 core 内部路径、host 或其他插件。

## 接口、调用位置与缺省行为

| 扩展点 | 核心接口及职责 | 当前实际调用点 | 当前实现 | 缺省/禁用 | 契约错误 |
|---|---|---|---|---|---|
| ShapeProvider | core/extensions/Contracts.ts；创建离线节点、恢复完整子树、提供 help 与可选创建反馈 | core/application/ShapeFactory.ts：create、fromAttributes、restore、creationFeedback、help；CreateCommand 与 SvgReader 调用服务 | builtin-shapes 中六类 provider；复合使用 FixtureProvider 测试替身 | 空表创建未知类型报错；未知 g 的 data-kind 降级普通 g；默认六种 provider | 重复/缺必需方法拒绝；无效节点/身份/归属拒绝；已注册复合标记缺 restore 或结构损坏拒绝，不降级 |
| Command | core/application/commands/Command.ts：执行协议；Contracts.ts 的 CommandDefinition 提供命令名、语法、help 和 build | host/cli/CommandDispatcher.parse；core/application/CommandExecutor.execute；command-stats 的 Definition.build/Command.execute；command-dir/DirCommandDefinition.build、DirCommand.execute | builtin-commands 十九条；独立 StatsPlugin、DirPlugin 分别注册自己的 Definition/Command 类 | 内置十九条不变，默认 A 另启 stats、dir；可分别禁用，未装时 unknown command | 重复/缺 build 或无效 execute/kind 拒绝；多参数各报 usage；stats 无文档报错，dir 不依赖文档；dir 读失败 cannot read directory: path；query 不建历史 |
| AttributeHandler | Contracts.ts：纯 handles；apply 接收只读目标及 AttributeEdits，可返回 applied/undone 反馈 | core/application/AttributeService.ts：resolve/plan；EditTransaction；SetAttributeCommand.plan 调用 | test/extensions 的 ProbeHandler、PairHandler；正式业务处理器在 P2-4 | 无匹配调用 SvgNode.planSetAttribute，保留原白名单 | 多匹配报 attribute handler conflict；操作/反馈/不变量失败逆序恢复，不转默认；门面关闭后报 transaction is closed |
| TreeDecorator | Contracts.ts：读取只读 TreeRow，返回可选后缀 | core/application/SceneQuery.ts：tree/suffixes；NodeFormatter.tree 拼接通用 suffixes | 本阶段使用 ProbeDecorator 测试类；正式标签在 P2-4/P2-5 | 空表后缀为空，tree 与 final 字节不变 | 重复/缺 decorate 拒绝；非字符串或换行后缀报 invalid tree decorator result；异常使本次查询失败 |

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

## 当前边界与下一阶段

P2-2b 已补齐属性事务、复合部件保护、生命周期和完整 XML 描述。正式设计依据见 [ADR 001](adr/001-attribute-transactions.md)、[ADR 002](adr/002-composite-restore.md)、[ADR 003](adr/003-lifecycle-and-labels.md)。真实业务插件的语义与接入证据仍按后续阶段验收。

## 安装、加载与外部端口

| 能力 | 公开契约与实际调用 | 缺省/错误 |
|---|---|---|
| 窄注册表 | ExtensionRegistrations；PluginContext 的四字段；StagedRegistry 暂存，ExtensionRegistry.registerBatch 提供宿主提交收据 | 名称/方法/help 校验，重复锁存；按完整类别回滚，不向插件上下文暴露恢复原语 |
| 插件与清单 | Plugin.activate、PluginManifest；PluginInstaller.install、PluginManifestReader | 无参类或实例；同步 void；四贡献缺省空集合；不匹配/抛错清理当前插件 |
| 作用域资源 | SessionEventSource.subscribe、ResourceOwner.add；PluginResources；应用退出 dispose | 提交前订阅休眠，失败释放，成功退出释放；清理异常独立诊断，无热卸载 |
| A/B 入口 | composition.optionalPlugins / createApplication；PluginConfiguration.read/parse；PluginLoader.load | 显式配置替换 A 可选列表；错误仅启内置；顺序加载，disabled 不解析 |
| 模块归属 | PluginModuleResolver.resolve/nativeResolve | Node ESM 条件；目录/包名/编译文件，清单不需 exports 子路径；顶层缺失与依赖求值失败区分 |
| 目录访问 | application/ports/DirectoryPort；host/filesystem/NodeDirectoryAdapter.read；PluginContext.directory；command-dir/DirCommand.execute | 未 init 可用；Adapter 保持 startup path/不跟随链接；DirCommand 过滤点项、分组字符串排序/两空格/空目录并规范失败；无模型/历史副作用 |

配置/错误的完整用户契约见 [PLUGIN_LOADING](PLUGIN_LOADING.md)，设计落点见 [ADR004](adr/004-plugin-installation.md) 和 [ADR005](adr/005-public-api-and-host.md)。stats、dir 已真实接入，分别使用文档 Iterator 与目录端口，均返回通用 lines；box/star 仍待后续。stats 提交92cde9f已通过实际差异检查，dir 当前仅为本地工作区，接入 SHA 待提交。

可核验测试：test/extensions/contracts.test.ts 覆盖四扩展点；transactions.test.ts 覆盖事务、失败恢复和重试；composites.test.ts 覆盖离线构建/保护/完整恢复/降级；lifecycle.test.ts 覆盖只读快照、成功通知、释放、异常隔离和测试基线/假标签。内置及新增命令包均有独立测试。架构测试使用 TypeScript 7 原生 AST 扫描 import/re-export/require/dynamic import，覆盖 core、host、生产插件及 VSCode src，排除产物/测试，并检查内部符号与 package exports。

P2-3b 增加 command-dir/test 的端口替身用例与 test/integration/dir 的真实目录/链接/失败继续交互、状态/历史/保存点观察者、A/B 同服务及两命令独立启禁用。Adapter 角色和固定 cwd 回放证据见 [P2-3b 报告](../docs/phase2/P2-3b_REPORT.md)。

P2-2c 增加 test/loading 的注册/清单/提交/订阅恢复与解析失败分类、NodeDirectoryAdapter 真实/替身测试、tools/framework-tools 的 A/B 原始输出/生成文件、未知 workspace 和真实 Git fixture 检查；架构扫描约束 loading/filesystem 不依赖具体插件。
