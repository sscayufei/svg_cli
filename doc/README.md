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
- Git commit SHA：待用户验收后提交。
- 验收状态：待用户验收；未授权进入 M2。

## 后续需确认的事项

- 计划尚未明确安排 canvas 修改尺寸，建议 M2 纳入；未视为已获批。
- 树修改入口、历史状态唯一归属，以及 SVG 读写复用唯一类型分派需在相关阶段细化。
- 跨父 group、transform、save 路径、IO 后历史清空规则尚待确认。
- 原需求 §6.1 流程图 A 有 7 个元素，但示例 save 输出 8；计数规则待确认。

M8 应补齐架构方案（含 PlantUML）、过程记录、一致性自查和质量保证手段，并以真实代码及测试为准。
