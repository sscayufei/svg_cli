# Phase 2 设计决策

状态：**采纳**。日期：2026-11-16。用户已同意首轮评审的建议设计；以下将其固定为开发基线。补充的工程细节用于消除执行歧义，不代表这些能力已经实现。接口的最终 TypeScript 签名在 P2-2 定稿；行为不能随意改变。

## D01：保留领域基础，建立四个稳定扩展点

保留 Composite、Command、Iterator、领域封装、局部 ChangeSet、文档 ID 索引及 IO 端口。内核定义 `ShapeProvider`、`Command`、`AttributeHandler`、`TreeDecorator`；扩展实现使用类或类实例。

内置十九条命令和六种图形通过注册装配，默认能力保持 Phase 1 行为。可选插件禁用不妨碍启动。插件只依赖公开领域抽象、扩展接口和受控服务，不导入宿主、装配模块、内部符号或其他插件实现。

目标布局：

```text
src/core/                     # 独立 workspace：@svgframe/core
  domain/                     # 节点/容器抽象、文档、变更记录
  application/                # 会话、历史、事务、扩展调用
  extensions/                 # 四类接口、注册协议、上下文
  public.ts                   # 唯一承诺支持的插件 API 出口
  package.json
src/host/
  cli/                        # REPL、分发、格式化
  svg/                        # XML 与文件存储适配
  filesystem/                 # NodeDirectoryAdapter
  loading/                    # 模块解析与安装事务
  composition.ts              # 方式 A 唯一顶层装配修改点
  main.ts                     # 稳定入口
plugins/
  builtin-shapes/
  builtin-commands/
  command-stats/
  command-dir/
  shape-box/
  tree-star/
extensions/vscode-svg/        # 独立 VSCode workspace
scripts/                     # 构建编排、回放、指标、差异核查
```

core 可保留公开 SvgGroup/容器基类；g 的创建/恢复由内置 provider 注册。具体五类叶子与其 provider 放在 builtin-shapes。box 通过公开 `ShapeConstructionPort` 请求基本节点，生产注入已注册形状的创建服务，单测注入替身；不直接 import builtin-shapes。缺基础构建能力时明确报错且不挂接任何节点。

构建期依赖方向是 core → 各插件 → host（箭头表示先构建）；运行时静态 import 的方向相反。core 不依赖插件，插件不依赖 host，不能让插件反向依赖包含 host 的根包。

## D02：命令、帮助与输出一同开放

命令注册描述携带名称、参数规则、help 和实例构建方法；Command 实例执行实际操作。保留 tokenizer 的引号信息和末尾 `in` 语义。help 从已注册描述生成，保持旧命令/六图形的原顺序与文案，新条目按确定顺序追加。

在框架阶段增加通用文本行结果，供 stats/dir 和插件反馈使用；渲染器统一负责换行，失败统一走 `error:` 通道。插件不能自行向 stdout/stderr 写内容。创建、属性处理的成功/undo/redo 反馈也必须有通用出口，避免 box 接入时修改渲染器。

可逆命令协议和可复用基类属于 core public API；执行器按协议检查 edit 能力，不要求插件依赖某个内部命令实现。query 不建历史，文档类成功才建立原有历史屏障；dir 访问磁盘仍是 query。

## D03：属性冲突拒绝，修改通过受控事务

`handles` 只读，查询支持目标类型/属性的处理器。零命中使用原属性白名单；多个命中在修改前报冲突，列出稳定注册名；恰好一个命中时执行对应处理器。处理器失败不转入默认处理。

handler 获取只读目标/子部件视图，通过事务门面调用公开操作计划。事务记录每个已完成原子 ChangeSet，异常时逆序恢复；反馈生成与不变量验证也处于提交边界内。成功后一次入栈，一次 set 即一个 undo 单元；redo 重放记录，不再次执行 handler。失败保留原文档、来源路径、ID/父引用、undo/redo 和 dirty 状态。

现有 ChangeSet 只保证已完成步骤回滚，不能接收任意“先改一半再抛错”的函数冒充原子步骤。公开事务应提供足够的受控操作，测试注入“第一处已改、第二处主动失败”。继续使用局部记录，不以全量文档复制替代撤销。

补齐无 handler 的 box 行为：使用通用容器默认属性能力。fill/stroke/stroke-width 修改 box 自身的 g 样式，不传播；label 报未知属性。正常 box 包整体安装会同时注册处理器；单独缺处理器的情况用于扩展点缺省测试。禁止把传播偷偷放在默认 set 中。

## D04：box 是受保护的复合容器

三种身份分开：领域类型 `box`；序列化标签 `g` 并附 `data-kind="box"`；树基础标题 `g#id`，由装饰器追加 `(box)`。容器判定使用公开能力，空 g 也属于容器。

创建模板固定为 rect `<id>-rect` 与 text `<id>-label`，rect 默认 fill 为 `#4a90d9`；文本初始位置采用 `(x+20, y+35)`，对所有合法尺寸使用同一固定偏移规则。这是讲义示例的模板定位，不声称严格几何居中或文字自适应；后续 move/scale 使用原有整体几何规则。宽高沿用 Phase 1 非负约束。

构造完整离线子树后，检查全部 ID 和父归属，再一次挂接。既有全子树 ID 校验可复用；公开构建器必须先补齐，插件不使用 `TreeAccess` 内部符号。

必要部件必须为直接孩子，ID/类型符合约定；允许额外普通孩子或嵌套 box。直接删除、移出、用 group 收编必要部件均拒绝；同一 box 内 front/back 调序允许。必要部件的普通几何/文本编辑允许；移动、删除、分组整个 box 允许。`ungroup box` 优先报告复合图形错误，包括根级 box。

core 通过通用容器结构策略检查上述限制，不含 box 名称/派生 ID 分支。所有破坏路径与 undo/redo 都需测试，不能只禁止一条命令。

## D05：读回先验证完整候选，再替换会话

已安装相应 provider：完整子树交给 provider 恢复；缺必要部件、类型错误或必要部件归属错误时拒绝整次 read。不能向当前会话暴露半成品 box。

未安装 provider：带未知 `data-kind` 的普通 g 降级为普通分组，保留孩子、几何与合法样式，移除不再成立的复合标记。本阶段采用静默降级，不额外增加 warning；缺 ID 等原有 warning 继续保留。

重复 ID 在降级/语义恢复之前全局检查，始终拒绝。未知复合标记规则只开放相应 g 的 data-kind，不顺带接受任意 data-* 或未知 SVG 标签。无 handler 不等于无 ShapeProvider，不能因此触发读回降级。

XML 与语义模型分离：先解析输入树、预留显式 ID 并按既有顺序补 ID，再后序构造/验证完整子树。writer 从通用 XML 描述获得标签、属性和内容，统一转义；不得输出 `<box>`。

## D06：dirty 采用内容差异，向祖先传播

以最近成功 save/read 的内容为基线；成功 init 建立新空画布基线。新节点立即 dirty，编辑到原值或 undo 回保存点后消失。比较几何、显式属性、文本、领域类型、父归属、孩子顺序和画布尺寸；不比较文件路径或对象引用。

节点变化向其当前祖先传播；删除/移出通过旧祖先孩子序列差异体现。成功 save（含另存）更新基线，失败不更新；canvas 修改可使根 dirty，即使它建立历史屏障。query/dir 不影响基线。

基线和缓存存于 ModifiedStarDecorator 实例私有字段，每个会话单独实例；不使用模块级变量。生命周期通知包括 init/read/save/成功编辑/undo/redo，由核心执行流程提交后发出；不能把所有 document 命令都当成保存。

观察者异常单独报告并隔离，不把已经成功的保存伪装为失败。安装失败要释放暂存订阅。标签的缓存可以重建，dirty 快照不承担 undo 功能。

## D07：标签按注册顺序组合

TreeDecorator 收到只读行上下文，返回零个或一个后缀；根 SVG 行也有上下文。每个非空后缀之间一个空格，基础行不变；零标签不产生额外空白。

默认顺序 box-type-label 在前、modified-star 在后，结果如 `g#n1 (box) *`。box 包在首次接入时包含其类型标签，之后 tree-star 独立接入，不回头修改已有 box。

装饰器之间互不调用、不读取对方状态。运行时装饰器抛错，本次 tree 报错且无文档/历史变化，CLI 可继续。这里采用装饰管线；模式报告如实说明与经典同接口对象包装式 Decorator 的差别，不为了命名强称完全等价。

## D08：两种装配共用安装事务

默认内置装配始终提供 Phase 1 能力。方式 A 由 composition 提供可选插件对象/清单，方式 B 的 `--config <path>` 以配置决定可选集合，替换 A 的可选清单。显式空配置用于无扩展基线。

两者都进入同一个 installer：暂存四类注册与订阅 → activate(ctx, options) → 名称/接口/manifest 校验 → 一次提交；任一步失败，撤销该插件全部暂存资源，保留已成功插件并继续加载。禁止 A 直接绕过 installer 调 activate。

四类贡献列表缺省为空，按类别及名称集合核对；同类重名拒绝，包括插件内部重复与和内置名冲突。诊断按固定类别顺序 `shapes, commands, decorators, attributes`，类别内按名称排序；避免输出取决于对象枚举偶然顺序。

配置先整体结构验证，再依次加载。`enabled:false` 完全不解析/求值/激活模块；options 原样传递，由插件验证，非法 options 视为激活失败。无 `--config` 使用代码装配；显式配置不可读/语法或结构错误时输出 `error: invalid plugin config`，仅使用内置能力启动。

规定错误字符串见 [验收清单](ACCEPTANCE.md)。缺默认导出和默认导出无效区分；后者使用激活失败并说明原因。先解析入口，再动态 import；入口存在但求值/依赖失败属于加载失败，不误报顶层模块找不到。

activate 只注册及建立可释放资源，不修改文档；框架不承诺回滚插件任意外部 I/O。不做热卸载、动态重载或插件隔离沙箱。

## D09：包边界、模块解析与构建入口

采用 npm workspaces：core、plugins/*、extensions/vscode-svg 为独立包，根包承担 host 和编排；只维护根 package-lock。CLI/core/插件使用 ESM，插件默认入口和类型导出均指向自身 dist，contributes 放在自身 package.json。插件不通过跨包相对路径绕过 exports。

模块解析约定：

1. 包名按配置目录的 Node 模块解析上下文处理，遵守 package exports；manifest 发现不能要求第三方包必须导出 `package.json` 子路径。
2. 相对/绝对路径指向插件包目录时，宿主通用解析其 package.json 的入口，再导入实际文件。需求示例 `./plugins/tree-star` 必须可用；不能直接对目录执行 ESM import。
3. 相对路径指向 JS 入口时，读取所属插件包的 manifest；包归属不明确则报插件加载失败，不能拿宿主根 package.json 充数。
4. 路径转 file URL，覆盖空格、中文、盘符；contributes 取自同一解析包。代码装配也读取同一份清单元数据，避免手工复制两份声明漂移。

P2-2c 前完成通用 workspace 构建发现/排序：core → 插件 → host；不能新增一个插件就必须修改已有构建脚本的名称映射。不要假设 npm 的 workspace 运行顺序自动等于依赖拓扑。干净构建和编译后 Node 运行是必验项，tsx 不能掩盖未构建的包入口。

VSCode 单独构建为 CommonJS bundle，vscode 模块 external、saxes 纳入 bundle；用 tsc 独立类型检查。这样扩展 VSIX 不依赖 monorepo 的提升目录或 CLI 包。此选择属于工程细化，不改变 CLI 的 ESM。

## D10：dir 的目录策略

DirCommand 依赖公开 DirectoryPort；NodeDirectoryAdapter 在 host 侧封装当前工作目录与直接条目读取。两种装配使用同一服务；该接口与适配器在框架冻结前就绪。

目录、普通文件、符号链接、其他项依次分组，各组用 JS 字符串序比较（大小写敏感、无 locale 转换）排序；标记为 `[DIR]`、`[FILE]`、`[LINK]`、`[OTHER]`，后接两个空格。包含隐藏项，不跟随链接、不递归、不改变 cwd。

空目录输出 `(empty directory)`；读取失败输出 `error: cannot read directory: <path>` 并保持可继续交互。所有成功/失败路径均不要求初始化 SVG、不改变文档/dirty/历史/来源路径。

## D11：VSCode 只读语法视图

使用 FileDecorationProvider 和 DocumentSymbolProvider，注册到 Explorer 文件装饰与原生 Outline；无需自建树视图。扩展按 SVG 文本文件路径识别，不依赖它被编辑器标成 SVG 还是 XML 语言；文件标记需排除目录，禁止祖先传播。

激活采用 `onStartupFinished`，让未打开 SVG 文本时 Explorer 也能得到标记；不只依赖 onLanguage。启动后的轻量注册不进行全工作区内容扫描。该事件在 VSCode 启动后触发，见 [官方激活事件说明](https://code.visualstudio.com/api/references/activation-events#onStartupFinished)。

独立语法树保留源码范围和原始 id，无 id 仅显示标签名、不补 ID；复用 saxes 依赖，不复用严格领域 SvgReader。XML 不完整返回空大纲，恢复合法后更新。源码偏移测试包含 CRLF、中文/emoji、多行属性、同一行多个元素、注释/CDATA、自闭合。

先观察原生大纲行为再实现；测试与演示用隔离的开发宿主，避免其他 XML provider 干扰。真实截图放在 doc/evidence/phase2，不使用需求图片作为完成证明。

## D12：兼容性、指标与提交证据

保留旧测试及语义断言，补充 Buffer 级原始 stdout/stderr 对比，不 trim、不去提示符、不统一换行。baseline 使用不可移动的 final；当前实现禁用全部可选扩展时比较原有能力。显式新增的 data-kind 降级属于 Phase 2 新能力，单独验收，不能据此修改旧行为。

内核/宿主装配/插件三类统计从 Git 历史生成，VSCode 单列；测试、依赖、构建产物不计 CLI 运行增量。复杂度以固定 TypeScript AST 规则计算并记录工具版本，指标需记录源码 SHA，支持最终 final/p2 重算。

在新增插件前冻结框架及已有实现。每个新增提交只增加插件与获准的装配/配置及必要依赖元数据、测试、文档；box 的 A/B 用同一父基线的独立演示提交/分支。实际路径存在性、排除规则及接入 SHA 随报告保存。

## 正式 ADR 与实现落点

| 正式 ADR（开发时写入 doc/adr） | 来源 | 最迟完成 |
|---|---|---|
| 001 属性处理与事务 | D02、D03 | P2-2b |
| 002 复合容器与读回降级 | D04、D05 | P2-2b；P2-4补验证位置 |
| 003 dirty 与标签组合 | D06、D07 | P2-2b；P2-5补状态机证据 |
| 004 安装校验与失败回滚 | D08、D09 | P2-2c |
| 005 公共 API、包与输出边界 | D01、D02、D09 | P2-2c |

本文件记录已采纳决定；正式 ADR 还须写上实际接口、调用文件/方法、替代方案与测试位置，不能仅复制设计文字宣称实现完成。
