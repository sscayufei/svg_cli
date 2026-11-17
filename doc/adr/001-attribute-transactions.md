# ADR 001：属性分派与受控事务

日期：2026-11-17。状态：通用能力已实现（P2-2b），真实 box 处理器及 A/B 接入验证通过（P2-4）。来源：设计决策 D02、D03。

## 问题与选择

复合属性可能同时修改多个部件。仅要求 handler 返回 ChangeSet，无法收回“先改一处再抛错”的修改；直接传可写节点或任意回调也不能提供原子性。采用只读目标视图和同步、限时的属性事务门面。

`AttributeHandler.handles(target, attribute)` 是纯匹配。零命中走节点原属性规则，多命中在修改前按注册顺序列出冲突；单命中调用 `apply(target, attribute, value, edits)`。处理器失败直接失败，不重试默认路径。

`AttributeEdits` 仅暴露 `read(id)` 和 `setAttribute(id, name, value)`；没有 document、commit、rollback 或任意函数步骤。read 返回复制冻结的属性、语义类型和直接孩子引用。setAttribute 调用节点原子计划并即时记录，支持同一字段多次修改和属性缺席的精确恢复。门面在成功或失败后关闭；捕获门面不能继续修改。

handler 可返回已应用/撤销反馈，框架在事务内复制、校验并冻结，然后验证文档不变量并合并已应用的局部记录。任一环节失败逆序恢复。成功命令只入栈一次；redo 重放既有记录及反馈，不重跑 handler。不使用整个文档副本作为撤销记录。

## 实际落点

| 文件 / 方法 | 责任 |
|---|---|
| src/core/extensions/Contracts.ts：AttributeHandler、AttributeEdits、OperationFeedback | 公开契约 |
| src/core/application/AttributeService.ts：resolve | 匹配、冲突、回退、事务和反馈边界 |
| src/core/application/EditTransaction.ts：view / edits / setAttribute / commit / rollback | 只读门面与已完成原子记录 |
| src/core/domain/ChangeSet.ts：fromApplied / applyChecked / revertChecked | 合并及结果/不变量检查失败的逆向恢复 |
| src/core/application/commands/NodeEditCommand.ts | execute/undo/redo 检查成功后才推进命令状态 |
| plugins/builtin-commands/src/SetAttributeCommand.ts | 一条 set 一个历史单元，读取事务反馈 |
| src/core/application/CommandHistory.ts | 成功后移动双栈，失败保留 redo |

创建与分组也使用受检查的 ChangeSet；创建反馈仍可在挂接前生成。自定义 ReversibleCommand 必须遵守相同原子协议，框架无法替任意第三方命令推断其逆操作。

## 替代方案与约束

拒绝全量文档复制：开销大、破坏对象身份，并掩盖部件保护问题。拒绝把任意回调当原子步骤：ChangeSet 只能恢复已完成步骤，不能恢复一个内部写到一半才抛错的步骤。保持原子节点操作、纯匹配/策略钩子和同步处理器契约；这不是隔离恶意插件的安全沙箱。

验证：`test/extensions/transactions.test.ts` 覆盖多部件单单元、局部抛错、第二次属性非法、反馈失败、不变量失败、execute/undo/redo 结果失败、保留来源与已有 redo、记录重放及门面关闭；`contracts.test.ts` 覆盖零/单/多命中和默认规则。

P2-4 实际落点为 `plugins/shape-box/src/BoxFillHandler.ts`、`BoxLabelHandler.ts` 的 handles/apply：语义 box 上的 fill 只写本矩形，label 只写本文本，通过 edits.read/setAttribute 工作，返回已应用和撤销反馈。旧值以 JSON 字符串或 `(unset)` 表示，空 label 和转义可恢复。没有处理器时保留普通 g 属性规则。单包 `plugins/shape-box/test/box.test.ts` 与真实 `test/integration/box.test.ts` 验证两属性、重放、冲突和人为两部件修改后失败的回滚，未修改通用事务。真实提交、回放与证据见 [P2-4 报告](../../docs/phase2/P2-4_REPORT.md)。
