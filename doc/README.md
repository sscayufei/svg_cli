# Lab1 Phase 1 — 阶段记录（正式报告待 M8 完成）

本文目前仅记录工程基线，不代表全部实验功能或正式报告已完成。原始需求位于 `docs/phase_cli_1.md`。

## M0 — 2026-10-17 — 工程骨架

- 授权范围：用户授权实施 M0，仅工程配置、最小 CLI 与 smoke test。
- 模块：`src/cli/SvgCli.ts` 封装输入输出生命周期；`main.ts` 只装配并启动。
- 架构取舍：Command/Composite 在后续指定里程碑落实；M0 不建立占位模型或历史机制。临时 help 判断在 M2 迁入唯一 CommandDispatcher。
- 工程选择：Node.js 24、TypeScript strict、ESM、tsx、Vitest；依赖由锁文件固定。
- 过程发现：PowerShell 阻止 npm.ps1，因此使用 npm.cmd；保留三份本地设计文档的 Git 忽略规则，阶段证据写入本文。
- 开发中发现并修复：首版在最后一行没有换行、直接 EOF 时，异步迭代拿到最后一行之前 readline 已关闭，再次 prompt 触发错误退出。保留对应回归测试，通过 close 事件跟踪关闭状态，关闭后不再 prompt。
- 测试环境：Windows PowerShell，Node.js v24.14.0、npm 11.9.0。npm 安装与 Vitest 启动最初受到沙箱缓存/子进程限制，获得权限后执行；未通过改动测试规避限制。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 为 1 个测试文件、4 个测试全部通过；`'help' | npm.cmd run cli` 与 `'help' | node dist/cli/main.js` 都显示提示符和帮助并正常退出；`git diff --check` 通过。
- 测试范围：空输入 EOF、CRLF 空行/整行注释、未实现命令报错后继续 help、无末尾换行的最后一行。尚未人工验证实体终端的 Ctrl+Z 按键行为。
- 架构符合性：仅 cli 模块引用 Node readline/stream；输入输出通过构造函数注入并封装。没有 domain/application/infrastructure 实现，没有 switch(tag)、any 或公共字段数据袋。Command/Composite 按计划留到后续阶段。
- 设计偏差：正式报告路径提前建立阶段记录草稿；未改动被忽略的设计基线，也未将待确认建议当作已批准决策。
- Git commit SHA：`020cc5a`（搭建运行环境）。
- 验收状态：用户已验收并提交，随后授权 M1。

## M1 — 2026-10-17 — 领域模型与 Composite

- 起点：M0 提交 `020cc5a`，工作区干净。
- 授权范围：六种内置图形模型、SvgDocument、ID 索引、完整父子约束与领域测试；不进入 M2。
- 用户确认：图形宽高/半径允许 0，画布宽高必须为正；所有几何数值有限。stroke-width 为有限非负数。
- 实现：SvgNode 为统一抽象；RectShape/CircleShape/EllipseShape/LineShape/TextShape 封装各自几何字段；SvgGroup 持有有序子节点；SvgDocument 管理根、索引和整体归属。
- Composite/Iterator：叶子和组都提供只读 children、getGeometry/getAttributes 和前序 Iterable；叶子没有孩子。领域对象不生成 CLI 文本或 XML。
- 树结构规则：append/insert 只接收未归属的子树根，父容器必须属于当前文档；拒绝重复 ID、重复归属、环和非法插入位置；先验证整棵子树，成功后统一写入。remove 注销全部子孙 ID，保留摘除子树内部的父子关系和对象身份，重新插入后完整恢复登记。
- 封装决策：字段采用 ECMAScript 私有字段；对外属性和 children 为冻结快照。TypeScript 没有包级 friend，internal/TreeAccess.ts 用 Symbol 提供聚合内部结构写入协议，仅 SvgDocument 调用，应用/CLI 禁止导入；该协议属于包内约定，不是防恶意调用的安全边界。
- 初始方案复核：样式参数采用结构类型，额外 x 字段可能覆盖查询结果中的几何属性，因此构造时拒绝三种公共样式以外的字段，并增加回归测试。
- 阶段边界说明：架构中的几何接口本轮落实为多态只读查询；move/scale/set 的变更行为按 M3 计划实现，未添加空方法或“尚未实现”异常占位。树结构仅提供聚合基础操作，未实现 group/ungroup/addto/front/back 用例或 Command/History。
- 目录细化：增加 SvgAttributes.ts 类型文件和 internal/TreeAccess.ts，仍位于 domain 内；未修改 CLI、依赖或工程配置。
- 测试过程：先写两份领域测试，在授权的沙箱外运行中因缺失模型模块失败；实现后首轮完整回归 42/42 通过，随后针对样式覆盖和嵌套容器恢复补充测试。
- 最终证据：`npm.cmd run build` 通过；`npm.cmd test` 为 3 个文件、44 项全部通过（40 项领域测试 + 4 项 M0 CLI 回归）；Node 直接加载 dist/domain 编译产物，执行嵌套创建、遍历、子树摘除和重新插入的 smoke check 通过；`git diff --check` 通过。
- 依赖复核：domain 只导入本层模块；SvgNode 对 SvgDocument/SvgGroup 的引用为 type-only，避免运行时循环；没有 Node I/O、CLI/XML、switch(tag) 或 any。
- Git commit SHA：`4c6aea4`（建立领域模型，设置统一 Node 抽象，实现六种内置图形模型）。
- 验收状态：用户已验收并提交，随后授权 M2。

## M2 — 2026-10-17 — 命令入口与基础查询

- 起点：M1 已由用户验收，提交 `4c6aea4`，工作区干净。
- 本轮范围：Tokenizer/Dispatcher、基础 Command/Executor/Session、六类型 create（含 in）、init、canvas、tree/show/help；不进入 M3。
- 用户确认补充：本轮补入 canvas 尺寸修改；canvas 无参数查询，两个参数修改，单参数报语法错误。init 一个参数指定宽度且高度为 600，无参数为 800×600。
- 分派约束：CommandDispatcher 对命令名、ShapeFactory 对类型名；均标记为未来重构点。格式器只解释结果和通用几何描述，不按图形标签再次分派。
- 设计细化：领域新增与 CLI 无关的点/线段/属性集合几何描述；独立 CLI 格式器输出 tree/show。CreateCommand 保存原节点、文档、父容器及插入位置并提供 undo/redo 协议，本轮不建立历史栈或启用 undo/redo 命令。
- 角色对应：Command/EditCommand 为请求协议；六个具体命令为 ConcreteCommand；Dispatcher 与 main 为 Client；CommandExecutor 为 Invoker；EditorSession、SvgDocument 和 SceneQuery 为 Receiver。命令不直接读写节点字段。
- 解析规则：只把整行起始的 # 作为注释；双引号保留空文本和引号元数据；引号内支持转义引号/反斜杠，其他反斜杠原样保留。只有未加引号的尾部 in 被识别为父容器子句。数值统一使用有限十进制/指数解析。
- 测试过程：先确认缺失模块与未实现会话导致的失败基线，再实现；首轮 64 项通过，针对小数/指数、文本转义和多根连接线补测后最终 6 个文件、66 项全部通过。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 66/66 通过；`node dist/cli/main.js` 会话验证创建、tree/show、canvas 修改及 box 错误；UTF-8 管道下中文往返通过；`git diff --check` 通过。Vitest 按既有环境要求在授权的沙箱外执行。
- 初始方案复核：SceneQuery 的父引用联合类型采用结构收窄，避免不安全强转；帮助结果只复制 syntax/description，避免把 Dispatcher 的构造回调带入结果快照。M0 smoke test 保留启动/注释/错误恢复/EOF 检查，随现有支持范围更新断言。
- 依赖审核：domain 仅依赖本层，application 依赖 domain，CLI 仅依赖 application 和本层；应用/CLI 不导入内部 TreeAccess。没有 switch(tag) 或新增形状类型分派。ResultFormatter 的结果联合类型分支只负责展示结果，不构造或路由命令。
- 变更范围：新增应用层、Tokenizer/Dispatcher/格式器、ShapeFactory/SvgNumber 和三份测试；扩展模型查询/画布基础能力，更新现有 CLI 与 smoke test、README。未新增依赖、历史栈、文件读写或后续编辑命令。
- 文档同步：按用户确认更新本地 ARCHITECTURE/DEVELOPMENT_PLAN/CODEX_PROMPT，保留三文件原有 Git 忽略规则；关键决定在本文中受版本控制。
- Git commit SHA：`7bf0221`（M2 命令入口）。
- 验收状态：用户已验收并提交，随后授权 M3。

## M3 — 2026-10-17 — 基础编辑与失败原子性

- 起点：M2 提交 `7bf0221`，工作区干净；只实施 M3。
- 用户确认：普通 g 的 fill/stroke/stroke-width 仅写在组上，按 SVG 继承，不覆盖孩子的显式样式；scale 只改变几何位置与尺寸，不改变 stroke-width 或文本内容。
- 实现范围：新增 MoveCommand、ScaleCommand、SetAttributeCommand、DeleteCommand；NodeEditCommand 封装共同执行/撤销/重做状态；接入既有 Dispatcher、Executor 和 CLI 格式器。
- 领域重构：GeometryState 为封装的几何值对象，形状类声明本类型的坐标轴及非负尺寸字段；统一数值校验与字段局部变更，避免五类叶子重复实现。SvgGroup 以 Composite 委托子节点准备变更，不根据 tag 分派。
- 原子性：先准备并校验全部子孙的改动，再应用 ChangeSet。每个步骤本身原子；若后续步骤失败，回滚已完成步骤。revert 失败也回滚已撤销步骤，记录保持可重试。当前领域写入步骤为受控赋值或已预校验的树操作。
- 撤销记录：move/scale 保存受影响字段的旧/新值，不依赖减位移或乘倒数；set 只保存单属性旧值/缺席状态；delete 保存同一节点/子树、父容器和原插入索引。不复制整份文档。
- 复核修正：初版样式记录捕获整个样式对象，改为单属性旧值，防止还原 fill 时覆盖其他样式。新增样式独立记录、组继承和命令重复调用状态回归。
- 测试过程：新增三个测试文件先验证失败基线；首轮实现 93/93 通过，复核补测后最终 9 个文件、95/95 通过（新增 29 项）。
- 实际执行：`npm.cmd run build` 通过；`npm.cmd test` 95/95 通过；UTF-8 管道运行 `node dist/cli/main.js`，中文 set、组 move/scale、tree、整组 delete 及删除后子孙不可寻址均符合预期；`git diff --check` 通过。Vitest 使用已授权的沙箱外运行权限。
- 依赖审核：domain 仅依赖本层；application 通过领域行为修改模型；CLI 只构建请求与显示结构化结果。两处名称分派仍为 Dispatcher/ShapeFactory；未向应用或 CLI 暴露 TreeAccess，也未引入 any。
- 变更范围：两个领域类、五个命令层类、三份测试；更新领域几何封装、Dispatcher/结果协议、帮助阶段标记和项目说明。没有新增依赖，没有实现 M4 的分组重排或 M5 历史栈。
- 文档偏差：增加 GeometryState、ChangeSet 和 NodeEditCommand，已记录理由并同步本地架构/提示文档；保留这些本地文件既有忽略规则。
- Git commit SHA：`687818c`（新增 move、scale、set、delete 命令）。
- 验收状态：用户已验收并提交，随后授权 M4。

## M4 — 2026-10-17 — 层级与顺序

- 起点：M3 已验收并提交为 `687818c`，工作区干净。
- 用户确认：group 新组置于首参数节点的原父级/原位置，成员按修改前文档前序排列。同父选中节点被摘除后自然校正插入位置。例如 A=[a,b]、B=[c,d]，group g c a 得到 A=[b]、B=[g,d]、g=[a,c]。
- 用户确认：group/ungroup/addto 仅改变树结构，不改几何和显式样式；继承随新父级变化，解组带样式的容器可能改变子节点外观。
- 实施范围：SceneEditor、五类结构命令、文档内受控转移、局部事务记录与测试；不实现历史栈或 SVG I/O。
- 测试先行：新增领域、应用、CLI 三份测试并确认缺失模块/命令导致的失败基线。
- 实现：SceneEditor 负责多节点结构规则；SvgDocument.planRelocate 原子更新父引用/有序列表，文档内转移不注销子树 ID；五个具体命令封装请求并保存局部 ChangeSet。
- 事务策略：group 预校验全部 ID、重复参数和祖先冲突，再插入空组并按原顺序转移；ungroup 先依次提升孩子，再删除空组。每次转移捕获该步骤执行前的父级/索引，逆序恢复；中途失败由既有 ChangeSet 回滚。记录只保存相关对象及局部位置，不复制文档。
- 复核修正：除 TypeScript 类型约束外，转移入口增加运行时容器检查，避免动态调用传入叶子后发生部分摘除。测试快照显式记录 parentId/childIds，避免私有字段对象的深比较掩盖结构差异。
- 测试过程：先确认三个新增测试文件的失败基线；首轮 115 项通过，补测非空根子树、动态非法目标、撤销中途失败及重试后，最终 12 个测试文件、117/117 通过（本轮新增 22 项）。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 117/117 通过；UTF-8 管道运行 `node dist/cli/main.js`，验证跨父 group g c a、中文文本、ungroup、addto 和 front 的树输出；`git diff --check` 通过。Vitest 仍使用授权的沙箱外子进程权限。
- 依赖检查：SceneEditor 只依赖 domain；具体命令仅调用领域服务；CLI 无 domain 直接依赖，TreeAccess 未暴露给服务外层。两处名称分派维持 Dispatcher/ShapeFactory；没有新增形状类型分派、Node I/O 反向依赖或公共数据袋。
- 变更概览：新增 SceneEditor、五个命令和三份测试；更新 SvgDocument、命令结果、Dispatcher/格式器、两份现有测试的帮助阶段标记，以及 README/本记录。未新增依赖，未引入历史栈或后续 I/O。
- 文档同步：将已确认的跨父分组和原生结构语义写入本地架构/计划/提示文档；保留三份文件的 Git 忽略规则，关键决策在本文受版本控制。
- Git commit SHA：`ef7673c`（实现 group、ungroup、addto、front、back 命令）。
- 验收状态：用户已验收并提交，随后授权 M5。

## M5 — 2026-10-17 — Undo/Redo 与历史边界

- 起点：M4 提交 `ef7673c`，工作区干净；只实施 M5。
- 用户确认：成功 init、canvas 修改（以及后续 read/save）清空双栈并禁用 undo/redo，下一条成功编辑开启新历史。查询及失败命令保留历史和禁用状态。
- 实现：CommandHistory 封装双栈与禁用标志；UndoCommand/RedoCommand 调用历史并返回原命令的结果；CommandExecutor 成功执行编辑后才入栈，成功执行文档命令后才设边界。main 创建唯一历史实例，显式注入 Executor 和 Dispatcher。
- 架构细化（ADR-009）：草案曾把历史状态同时分配给 Session 与 History，现由 History 独占，避免状态不同步。Command.kind 增加 history，撤销/重做不会再次入栈。未改变 domain，也未增加图形或命令名分派点。Visitor/Observer/Decorator 仍无本轮必要场景。
- 原子性与记录：沿用 M2～M4 的节点身份、局部属性旧/新值、原父级/索引和 ChangeSet；没有生产用全量文档快照。历史先完成 undo/redo，再移动栈项；异常保留两栈，允许修复外部冲突后重试。每条成功编辑均为一个单元，包含无效果的合法编辑；新的成功编辑清空 Redo。
- 错误约定：历史禁用时 undo 和 redo 均使用原需求的 `undo not allowed after io command`；未初始化时沿用 no document；未禁用且空栈时分别为 `nothing to undo` / `nothing to redo`。
- 测试先行：新增历史测试，确认 CommandHistory 模块缺失导致失败基线。首轮完整运行 127/128 通过，唯一失败为新增测试误写既有 box 错误文案；核对原需求后修正断言，保留生产错误文本。
- 回归证据：所有十类编辑逐前缀反向撤销、正向重做，检查精确属性、节点身份、父引用、兄弟顺序及 ID 索引；覆盖六种形状、跨父 group、嵌套子树 delete/restore、属性缺席、小数恢复。另有游标时间线状态机、失败与查询保留 Redo、分叉、文档边界、空栈、真实 undo/redo 失败重试、复合撤销中途失败回滚与重试。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 最终 14 个文件、130/130 通过（本轮新增 13 项）；UTF-8 管道回放 `node dist/cli/main.js`，圆形 100→130→100→130、中文文本撤销、整组删除恢复及 group 撤销后的原父级输出均通过；`git diff --check` 通过。Vitest 使用授权的沙箱外子进程权限。
- 依赖检查：domain 无 application/CLI/Node I/O 反向依赖；CLI 不直接导入 domain；TreeAccess 未泄漏到应用层。CommandHistory 只管理请求历史，业务仍由领域对象/服务完成。
- 变更范围：新增三个应用类及两份测试；更新执行器、命令分类、入口装配、Dispatcher/help、现有三份测试与 README/本记录。没有依赖变更或 SVG 文件读写。
- 文档同步：本地架构/计划/提示文档记录 ADR-009 和确认的历史规则，保留原 Git 忽略规则；关键决定在本文受版本控制。
- Git commit SHA：`4774476`（接入 undo/redo 双栈）。
- 验收状态：用户已验收并提交，随后授权 M6。

## M6 — 2026-10-17 — SVG 保存

- 起点：M5 提交 `4774476`，工作区干净；只实施 M6，不实现 read。
- 用户确认：无参数 save 只回到成功 read 的来源路径，显式 save 不更新默认路径；相对路径按进程工作目录解析。本阶段没有 read，需显式指定目标，默认来源状态留到 M7。
- 用户确认：提示计数包含全部图形/g，排除根 svg。复核修正此前 AI 的误计：§6.1 实际有 3 个 g、2 个 rect、2 个 text、1 个 line，共 8 个；原示例没有计数错误。已纠正本记录的待确认项。
- 实现及职责：应用层 SvgSavePort 定义保存接口；SaveCommand 只执行用例、校验前提并映射标准文件错误；SvgWriter 纯序列化；AtomicFileWriter 处理文件替换；SvgFileStore 组合两者，main 装配注入。保留同步 Command 契约，无新增依赖。
- 序列化：通过文档 Iterable、节点公开属性和父引用输出所有六种形状及嵌套组，祖先栈避免递归栈溢出；无按 tag 的新增分派。输出 XML 声明、namespace、width/height/viewBox、有序元素、text 子文本和显式样式，缺席样式不补默认值。转义特殊字符，处理 XML 属性空白规范化，非法字符/孤立代理项明确失败，不静默替换。
- 文件保护：完整序列化后才创建同目录唯一临时文件，wx 写入 UTF-8、fsync、关闭后 rename 替换；失败时尽力清理，不先截断原文件。不自动创建缺失目录；不承诺进程崩溃或断电后的清理。
- 历史边界：SaveCommand 分类为 document，沿用 Executor 成功后清空并禁用历史。保存失败不改变文档/历史；无默认路径、序列化失败和真实文件写入失败均测试保留 Redo。成功保存不修改任何默认路径状态。
- 测试先行：先新增 SvgWriter 测试并确认缺失模块失败基线；序列化/原子写入首轮 15/15 通过。接入 SaveCommand 后完整 151/151 通过，补入讲义示例回放后最终 18 个文件、152/152 通过（本轮新增 22 项）。
- 测试覆盖：全部六类型、嵌套顺序、空画布/空文本、缺席样式、中文/Emoji/特殊字符、非法 XML 字符、1500 层分组；Windows 真实覆盖、部分写入与 rename 失败的旧文件保护及临时文件清理；相对/绝对/空格/中文路径、缺失路径、保存边界、失败保留两栈；讲义 8 元素示例。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 152/152 通过；编译后 CLI 回放 examples/demo.cli 生成 demo.svg，提示 8 elements；独立 .NET XML 解析核对 namespace、viewBox、节点数及中文。隐藏无头 Chrome 实际渲染并检查截图，两个彩色节点、连线和中文布局符合讲义；`git diff --check` 及新增文件空白检查通过。Vitest 和浏览器使用已授权的沙箱外执行权限。
- 依赖复核（ADR-010）：domain 未修改，无反向 I/O 依赖；应用仅依赖保存端口，具体基础设施仅在 main 引用；内部 TreeAccess 未暴露，名称分派仍集中于 Dispatcher/ShapeFactory。Visitor/Observer/Decorator 未引入。
- 变更范围：新增五份生产文件（一个接口、四个类）、四份测试、demo.svg 及 examples/demo.cli；更新结果协议、命令装配/分发/格式器、现有测试帮助标记、README 与本记录。未安装依赖，未实现 SVG 读取、来源路径替换、transform 导入或 M7 功能。
- 文档同步：本地架构/计划/提示文档记录已确认路径、计数与 ADR-010，保留原有 Git 忽略规则；关键决策由本文跟踪。
- Git commit SHA：`c7d4b04`（实现 save <file.svg> 命令）。
- 验收状态：用户已验收并提交，随后授权 M7。

## M7 — 2026-10-17 — SVG 读取与来源路径

- 起点：M6 提交 `c7d4b04`，工作区干净；只实施 M7。
- 用户确认输入范围：六类型及嵌套 g；transform、未知元素/属性（含 style/font-size/data-*）、叶子中的子元素整次失败。允许 XML 声明、注释、CDATA、SVG 命名空间；拒绝 DTD。根 width/height 必须为正，可带 px；viewBox 可缺省，存在时必须匹配 0 0 width height。图形几何缺省 0；空 ID 视作缺失，先预留所有显式 ID，再按前序和每类型序号补 ID。
- 具体适配边界：UTF-8 XML 1.0，可接受 BOM；根只接收 width/height/viewBox 与命名空间声明，接受 SVG 前缀或无命名空间文件。外来命名空间、不支持的处理指令和非 UTF-8 明确失败。读写往返保留模型语义，格式与命名空间前缀会规范化。
- 用户批准依赖：新增固定运行时 saxes@6.0.0（带入 xmlchars）；沙箱内安装遇到 ENOTCACHED，使用获批网络权限完成安装。XML 库仅出现在基础设施层。
- 编译兼容修正：首次 build 报错全部来自 saxes 声明，涉及 TS7 泛型约束与 exactOptionalPropertyTypes。提出方案后，用户明确批准 skipLibCheck:true；源码 strict/exactOptionalPropertyTypes/noUncheckedIndexedAccess 及调用处类型检查继续开启。未更改 node_modules 声明或降低源码严格性。
- 实现职责（ADR-011）：SvgReader 解析为前序输入记录，完成根/命名空间检查、显式 ID 预留和候选树构建。ShapeFactory 在原唯一类型表中补充几何元数据，提供通用 fromAttributes，使 CLI 和读取复用类型创建/校验，不增加标签分派。SvgFileStore 负责读取字节、UTF-8 解码及绝对路径；SvgReadPort 返回候选文档/警告/来源。ReadCommand 完整成功后调用 EditorSession.load；Executor 随后触发历史边界。
- 原子性：失败候选不触及当前文档、路径、双栈；候选警告只在成功结果中发布。重复 ID 保持原需求的 id already exists 文案，文件读取失败保持 cannot read file，XML 语法错误带 invalid SVG 诊断。
- 来源生命周期：成功 read 替换为绝对路径，成功 init 清空；失败 read/init 保留。编辑、canvas 修改及显式 save 保留来源；无参数 save 回到来源，新的成功 read 更新默认目标。读入文档继续支持同一组编辑与 Undo/Redo，无单独的导入节点类型。
- 测试先行：新增 Reader 测试确认模块缺失失败基线；首轮 Reader 36/36 通过。首次完整回归 200/201 通过，唯一失败为新增测试漏算对同一缺 ID 原文件再次读取的警告；修正断言，并验证保存后的副本不再补号。补入编码/命名空间边界后最终 22 个文件、204/204 通过（本轮新增 52 项）。
- 覆盖：全文后置显式 ID、空 ID、大小写、七元素原需求 fixture、六类型/嵌套/样式/文本往返、CDATA/实体、XML 错误、DTD、未知内容、非法几何、px/viewBox、命名空间、XML 版本、无效 UTF-8、默认来源与复制保存、失败后继续 Undo/Redo、替换成功后的历史清理。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 204/204 通过；编译后 CLI 在 dist/m7-verification 内回放原需求 other.svg，读取→编辑→撤销/重做→无参数保存→重新读取→整组删除恢复→另存→再读取均通过；独立 .NET XML 解析核对 7 元素与几何值，保存后不再告警。`git diff --check` 和新增文件空白检查通过。Vitest 使用授权的沙箱外子进程权限。
- 依赖复核：domain 不依赖 XML/fs/application；基础设施依赖领域及端口；CLI 仅装配入口引用具体基础设施。ShapeFactory 仍为唯一图形类型注册表，Dispatcher 为唯一命令名称分派；未引入 Visitor/Observer/Decorator 或插件。
- 变更范围：新增 SvgReadPort、ReadCommand、SvgReader、四份测试及原需求 fixture；扩展 Session/SaveCommand/FileStore/Factory、结果和 CLI 装配契约；更新 package/lock、获准的 tsconfig 兼容选项、既有帮助测试和说明。未修改 demo.svg，未实施 M8 总验收/正式报告。
- 文档同步：本地架构/计划/提示文档记录输入规则和 ADR-011，保留原有 Git 忽略规则；关键决策在本文跟踪。
- Git commit SHA：待用户验收后提交。
- 验收状态：待用户验收；未进入 M8。

## 后续需确认的事项

- canvas 修改尺寸已由用户明确批准纳入 M2。
- M0～M7 的范围与输入/历史/路径规则均已确认；ShapeFactory 的唯一类型分派已复用于导入。
- M8 需独立授权后完成完整需求矩阵、正式架构图/报告与交付检查；若教师要求支持当前子集以外的 SVG 内容，再按新增需求评估。

M8 应补齐架构方案（含 PlantUML）、过程记录、一致性自查和质量保证手段，并以真实代码及测试为准。
