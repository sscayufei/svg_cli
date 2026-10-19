# SVG CLI — Lab1 Phase 1

TypeScript + Node.js SVG 命令行编辑器，按 M0～M8 分阶段开发。

M0～M8 的实现、综合本地验收和正式报告已完成，待用户验收本轮修改并完成最终 Git 提交、推送和 final 标签。支持完整编辑 CLI、Undo/Redo 和 SVG 读写。

M1 提供六种图形的封装模型、统一几何/属性查询、Composite 子树、前序遍历、文档级 ID 索引和受控挂接/摘除。领域模型也可通过 TypeScript API 使用。图形尺寸和半径允许为零，画布尺寸必须为正，所有几何数值必须有限。

M2 将模型接入 CLI，支持 `init`、`canvas` 查询/修改、六类型 `create` 及 `in`、`tree [id]`、`show <id>`、`help`。`init 400` 使用默认高度 600；`canvas` 修改要求同时给出宽高。

M3 支持 `move <id> <dx> <dy>`、`scale <id> <factor>`、`set <id> <attr> <value>` 和 `delete <id>`。容器移动/缩放递归覆盖子孙，缩放同时改变位置与尺寸；比例必须为正，数值溢出使整个操作失败。组样式只写入组自身，按 SVG 继承规则生效，保留孩子的显式样式；stroke-width 和文本内容不会随 scale 改变。

M4 支持 `group <newGid> <id1> <id2>...`、`ungroup <gid>`、`addto <gid> <id>`、`front <id>`、`back <id>`。新组使用首参数节点的原父级/位置，成员按原文档顺序排列；跨父分组允许，同父移除选中节点后校正位置。ungroup 仅允许嵌套组，根级组按实验要求禁止解散；孩子占据原组位置。addto 放在目标容器末尾，front/back 只调整同级顺序。结构操作不改几何和显式样式，继承随父级变化；因此解散带样式的组可能改变外观。

M5 支持 `undo` / `redo`，每条成功编辑占一个历史单元，包括整组和整棵子树操作。新编辑清空 Redo；查询及失败命令保留历史。成功 init、read、canvas 修改或 save 清空双栈并禁用 Undo/Redo，直到下一条成功编辑开启新历史；禁用时两条命令均报 `error: undo not allowed after io command`。

M6 支持 `save <file.svg>`，输出 UTF-8 SVG，包含嵌套组、几何、显式样式和转义后的文本。支持绝对路径、相对路径及引号包裹的中文/空格文件名；相对路径以启动 CLI 的工作目录解析，不自动创建目录。先完整序列化并写入同目录临时文件，再替换目标，避免写入失败截断旧文件。保存失败保留文档及历史。保存提示统计所有图形和 g，排除根 svg。

M7 支持 `read <file.svg>`，可直接建立当前文档。完整解析、补 ID 和验证成功后才替换当前文档及来源路径；失败保留文档、路径和历史。缺失或空 ID 按类型加序号生成，先预留全文显式 ID 避免冲突，成功后逐项输出 warning。重复 ID 直接报错。读写往返保留几何、显式样式、文本、父子归属和绘制顺序。

无参数 save 使用最近成功 read 的绝对来源路径，显式 save 不更新该路径；成功 init 清除来源，编辑和 canvas 修改保留来源。没有 read 来源时报 `error: no source path. use 'save <file.svg>'`。模型中的非法 XML 字符会使保存失败，保留原有文件。

输入范围已明确限定：UTF-8 XML 1.0；根 svg 仅支持 width/height/viewBox 与命名空间声明，width/height 必须为正数（可带 px），viewBox 如存在必须为 `0 0 width height`。形状几何使用无单位数字，缺省值为 0；只支持六种形状的几何、公共 fill/stroke/stroke-width 及 text 子文本。允许 SVG 命名空间前缀、注释和 CDATA。遇到 transform、未知标签/属性（包括 style/font-size/data-*）、叶子中的子元素、DTD 或处理指令会明确失败。

## 环境与运行

使用 Node.js 24.x 和 npm。Windows PowerShell 如阻止 `npm.ps1`，使用 `npm.cmd`，无需修改执行策略。

运行时 XML 解析依赖固定为 saxes 6.0.0。经用户确认，tsconfig 的 skipLibCheck 用于兼容它与 TypeScript 7 的声明差异；源码的 strict、exactOptionalPropertyTypes 及调用处类型检查保留。

```powershell
npm.cmd ci
npm.cmd run cli
```

输入 `help` 查看当前能力。整行注释可以带前导空白；命令内部的 `#` 不会被当作注释。Windows 交互终端输入 Ctrl+Z 后按 Enter 发送 EOF；Unix 终端使用 Ctrl+D。

```text
init
create g node1
create rect start 120 100 160 60 #4a90d9 in node1
create text start-label 155 135 "开始" in node1
tree
show start
move node1 10 20
scale node1 0.5
set start-label text "完成"
tree
delete node1
undo
tree
redo
save output.svg
```

双引号包裹带空格参数；引号内支持 `\"` 和 `\\`，其他反斜杠原样保留。空文本 `""` 合法；只有未加引号的尾部 `in <containerId>` 才作为父容器子句。数值支持十进制小数和指数形式，拒绝 NaN、Infinity、十六进制和带单位的参数。

Windows PowerShell 5 用管道回放含中文的命令时，先设置 `$OutputEncoding = [System.Text.UTF8Encoding]::new($false)`，避免 shell 将中文转换成问号。

[demo.svg](demo.svg) 是讲义 §6.1 的两节点流程图，可直接拖入浏览器查看。用 [examples/demo.cli](examples/demo.cli) 重现生成过程：

```powershell
npm.cmd run build
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Encoding UTF8 examples/demo.cli | node dist/cli/main.js
```

读取现有示例并另存：

```text
read demo.svg
move node2 0 100
save copy.svg
```

原需求中的外部文件示例位于 [test/fixtures/other.svg](test/fixtures/other.svg)，读取时会为背景矩形补充 rect1。

## 验证

```powershell
npm.cmd run build
npm.cmd test
node dist/cli/main.js
git diff --check
```

`build` 严格编译 `src/`；Vitest 单次运行领域、应用、分词器及真实 Node 子进程的 CLI 测试，不使用 watch 模式。测试覆盖全部形状编辑、失败原子性、精确浮点恢复、属性缺席、子树 ID/父引用、跨父分组、同级顺序、双栈分叉和历史边界，以及结构事务中途失败和撤销重试。历史状态机测试逐步比较文档状态；生产实现只保留局部变更记录，不复制整个文档。保存测试覆盖 XML 转义、非法字符、1500 层嵌套、真实文件覆盖、部分写入/替换失败、CLI 路径及历史边界。

读取测试覆盖 ID 预留、六类型及嵌套结构、XML/命名空间/编码边界、来源路径生命周期、失败后继续 Undo/Redo，以及真实文件 read/save/read 往返。

M8 验收结果为 24 个测试文件、214 项通过。`test/integration/cli.acceptance.test.ts` 精确核对讲义典型会话、六类型结构编辑往返和流程图；`test/architecture/dependencies.test.ts` 检查层次依赖及类组织。编译后的三份会话与 Chrome 流程图渲染均已验证。

## 文档与迭代

- 原始需求：`docs/phase_cli_1.md`，优先级最高。
- 本地设计基线：`docs/ARCHITECTURE.md`、`docs/DEVELOPMENT_PLAN.md`、`docs/CODEX_PROMPT.md`，保留现有 Git 忽略规则。
- [正式报告与过程记录](doc/README.md)：含架构方案、PlantUML 包图、过程记录、一致性自查、质量保证和完整需求/测试对应表。
- 每阶段需验收并由用户完成 Git 提交；下一阶段必须单独授权。

原有初始化说明 `READMEmd` 保留。

当前分支为 master，已配置 origin。M8 验收前未执行提交、推送或创建标签；最终交付需由用户核对截止时间、远端及最终提交 SHA，再完成提交和 final 标签的推送。
