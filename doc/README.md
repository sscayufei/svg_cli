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
- Git commit SHA：待用户审阅后提交。
- 验收状态：待用户验收；未授权进入 M1。

## 后续需确认的事项

- 计划尚未明确安排 canvas 修改尺寸，建议 M2 纳入；未视为已获批。
- 树修改入口、历史状态唯一归属，以及 SVG 读写复用唯一类型分派需在相关阶段细化。
- 跨父 group、transform、save 路径、IO 后历史清空规则尚待确认。
- 原需求 §6.1 流程图 A 有 7 个元素，但示例 save 输出 8；计数规则待确认。

M8 应补齐架构方案（含 PlantUML）、过程记录、一致性自查和质量保证手段，并以真实代码及测试为准。
