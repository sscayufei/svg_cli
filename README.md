# SVG CLI — Lab1 Phase 1

TypeScript + Node.js SVG 命令行编辑器，按 M0～M8 分阶段开发。

当前已实现 M0～M2：工程骨架、领域模型和可用的创建/查询 CLI。

M1 提供六种图形的封装模型、统一几何/属性查询、Composite 子树、前序遍历、文档级 ID 索引和受控挂接/摘除。领域模型也可通过 TypeScript API 使用。图形尺寸和半径允许为零，画布尺寸必须为正，所有几何数值必须有限。

M2 将模型接入 CLI，支持 `init`、`canvas` 查询/修改、六类型 `create` 及 `in`、`tree [id]`、`show <id>`、`help`。`init 400` 使用默认高度 600；`canvas` 修改要求同时给出宽高。其余编辑命令、SVG 读写和 Undo/Redo 尚未实现，`help` 会列明阶段边界。

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

`build` 严格编译 `src/`；Vitest 单次运行领域、应用、分词器及真实 Node 子进程的 CLI 测试，不使用 watch 模式。应用测试验证 CreateCommand 的最小撤销记录和失败恢复，CLI 测试覆盖完整嵌套会话、错误文案、画布修改、注释、引号和 EOF。撤销协议已具备，但历史栈及 undo/redo 命令按计划留到 M5。

## 文档与迭代

- 原始需求：`docs/phase_cli_1.md`，优先级最高。
- 本地设计基线：`docs/ARCHITECTURE.md`、`docs/DEVELOPMENT_PLAN.md`、`docs/CODEX_PROMPT.md`，保留现有 Git 忽略规则。
- 正式报告与过程记录：`doc/README.md`，当前为阶段记录草稿，M8 补齐正式报告。
- 每阶段需验收并由用户完成 Git 提交；下一阶段必须单独授权。

原有初始化说明 `READMEmd` 保留。
