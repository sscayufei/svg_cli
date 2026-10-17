# SVG CLI — Lab1 Phase 1

TypeScript + Node.js SVG 命令行编辑器，按 M0～M8 分阶段开发。

当前已实现 M0 工程骨架及 M1 领域模型。CLI 仍只支持 `svg>` REPL、空行与整行注释、简要 `help`、EOF 退出；编辑命令、文件读写和历史功能尚未实现。

M1 提供六种图形的封装模型、统一几何/属性查询、Composite 子树、前序遍历、文档级 ID 索引和受控挂接/摘除。领域模型通过 TypeScript API 使用，尚未接入 CLI。图形尺寸和半径允许为零，画布尺寸必须为正，所有几何数值必须有限。

## 环境与运行

使用 Node.js 24.x 和 npm。Windows PowerShell 如阻止 `npm.ps1`，使用 `npm.cmd`，无需修改执行策略。

```powershell
npm.cmd ci
npm.cmd run cli
```

输入 `help` 查看当前能力。整行注释可以带前导空白；命令内部的 `#` 不会被当作注释。Windows 交互终端输入 Ctrl+Z 后按 Enter 发送 EOF；Unix 终端使用 Ctrl+D。

## 验证

```powershell
npm.cmd run build
npm.cmd test
node dist/cli/main.js
git diff --check
```

`build` 严格编译 `src/`；Vitest 单次运行领域测试及真实 Node 子进程的 CLI smoke test，不使用 watch 模式。领域测试验证几何/样式封装、ID、父子关系、遍历顺序、失败不变和子树重新挂接。CLI 测试通过 `tsx` 运行源码，验证启动、提示符、注释、错误恢复和 EOF。

## 文档与迭代

- 原始需求：`docs/phase_cli_1.md`，优先级最高。
- 本地设计基线：`docs/ARCHITECTURE.md`、`docs/DEVELOPMENT_PLAN.md`、`docs/CODEX_PROMPT.md`，保留现有 Git 忽略规则。
- 正式报告与过程记录：`doc/README.md`，当前为阶段记录草稿，M8 补齐正式报告。
- 每阶段需验收并由用户完成 Git 提交；下一阶段必须单独授权。

原有初始化说明 `READMEmd` 保留。
