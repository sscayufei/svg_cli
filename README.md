# SVG CLI — Lab1 Phase 1

TypeScript + Node.js SVG 命令行编辑器，按 M0～M8 分阶段开发。

当前已实现 M0～M5：工程骨架、领域模型、创建/查询 CLI、基础编辑、层级/顺序操作和 Undo/Redo。

M1 提供六种图形的封装模型、统一几何/属性查询、Composite 子树、前序遍历、文档级 ID 索引和受控挂接/摘除。领域模型也可通过 TypeScript API 使用。图形尺寸和半径允许为零，画布尺寸必须为正，所有几何数值必须有限。

M2 将模型接入 CLI，支持 `init`、`canvas` 查询/修改、六类型 `create` 及 `in`、`tree [id]`、`show <id>`、`help`。`init 400` 使用默认高度 600；`canvas` 修改要求同时给出宽高。

M3 支持 `move <id> <dx> <dy>`、`scale <id> <factor>`、`set <id> <attr> <value>` 和 `delete <id>`。容器移动/缩放递归覆盖子孙，缩放同时改变位置与尺寸；比例必须为正，数值溢出使整个操作失败。组样式只写入组自身，按 SVG 继承规则生效，保留孩子的显式样式；stroke-width 和文本内容不会随 scale 改变。

M4 支持 `group <newGid> <id1> <id2>...`、`ungroup <gid>`、`addto <gid> <id>`、`front <id>`、`back <id>`。新组使用首参数节点的原父级/位置，成员按原文档顺序排列；跨父分组允许，同父移除选中节点后校正位置。ungroup 仅允许嵌套组，根级组按实验要求禁止解散；孩子占据原组位置。addto 放在目标容器末尾，front/back 只调整同级顺序。结构操作不改几何和显式样式，继承随父级变化；因此解散带样式的组可能改变外观。

M5 支持 `undo` / `redo`，每条成功编辑占一个历史单元，包括整组和整棵子树操作。新编辑清空 Redo；查询及失败命令保留历史。成功 init 或 canvas 修改清空双栈并禁用 Undo/Redo，直到下一条成功编辑开启新历史；禁用时两条命令均报 `error: undo not allowed after io command`。当前 SVG 文件读写尚未实现。

## 环境与运行

使用 Node.js 24.x 和 npm。Windows PowerShell 如阻止 `npm.ps1`，使用 `npm.cmd`，无需修改执行策略。

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
```

双引号包裹带空格参数；引号内支持 `\"` 和 `\\`，其他反斜杠原样保留。空文本 `""` 合法；只有未加引号的尾部 `in <containerId>` 才作为父容器子句。数值支持十进制小数和指数形式，拒绝 NaN、Infinity、十六进制和带单位的参数。

Windows PowerShell 5 用管道回放含中文的命令时，先设置 `$OutputEncoding = [System.Text.UTF8Encoding]::new($false)`，避免 shell 将中文转换成问号。

## 验证

```powershell
npm.cmd run build
npm.cmd test
node dist/cli/main.js
git diff --check
```

`build` 严格编译 `src/`；Vitest 单次运行领域、应用、分词器及真实 Node 子进程的 CLI 测试，不使用 watch 模式。测试覆盖全部形状编辑、失败原子性、精确浮点恢复、属性缺席、子树 ID/父引用、跨父分组、同级顺序、双栈分叉和历史边界，以及结构事务中途失败和撤销重试。历史状态机测试逐步比较文档状态；生产实现只保留局部变更记录，不复制整个文档。

## 文档与迭代

- 原始需求：`docs/phase_cli_1.md`，优先级最高。
- 本地设计基线：`docs/ARCHITECTURE.md`、`docs/DEVELOPMENT_PLAN.md`、`docs/CODEX_PROMPT.md`，保留现有 Git 忽略规则。
- 正式报告与过程记录：`doc/README.md`，当前为阶段记录草稿，M8 补齐正式报告。
- 每阶段需验收并由用户完成 Git 提交；下一阶段必须单独授权。

原有初始化说明 `READMEmd` 保留。
