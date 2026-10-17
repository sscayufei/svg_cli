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
- Git commit SHA：待用户验收后提交。
- 验收状态：待用户验收；未授权进入 M5。

## 后续需确认的事项

- canvas 修改尺寸已由用户明确批准纳入 M2。
- 树修改入口、历史状态唯一归属，以及 SVG 读写复用唯一类型分派需在相关阶段细化。
- 跨父 group 和结构操作样式语义已在 M4 确认；transform、save 路径、IO 后历史清空规则仍待后续确认。
- 原需求 §6.1 流程图 A 有 7 个元素，但示例 save 输出 8；计数规则待确认。

M8 应补齐架构方案（含 PlantUML）、过程记录、一致性自查和质量保证手段，并以真实代码及测试为准。
