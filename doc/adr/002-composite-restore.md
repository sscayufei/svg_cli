# ADR 002：复合容器保护与完整 SVG 恢复

日期：2026-11-17。状态：通用能力已实现（P2-2b），真实 box 模板与接入证据待 P2-4。来源：D01、D04、D05。

## 问题与选择

复合图形同时具有语义类型、树显示标签和 XML 标签。核心不应识别具体插件名、必要部件名或派生 ID；读回也不能按普通空组先挂接、再逐个补部件。

保留 SvgGroup 作为公开 Composite 基类。插件重写 `type`、`displayType`、`describeSvg()`，分别表达语义身份、树基础标题和 XML 描述。writer 只读描述，统一处理标签/属性名校验、转义、文本及闭合标签；ID 始终由节点提供，描述不可覆盖 ID。

复合 provider 通过 `ShapeConstructionPort.create` 请求基础节点，再以 `SubtreeBuilder.assemble` 构建完整离线子树。生产形状服务实现此端口，插件单测注入替身。构建时验证所有 ID、归属、父引用、接收策略和嵌套结构；失败不留下部分父引用。文档 insert 再验证全子树与全局 ID，之后一次挂接/注册。

公开纯策略钩子为 `assertCanAccept`、`assertCanRelease`、`assertCanUngroup`、`verifyStructure`。文档统一保护 insert/remove/跨父 relocate，SceneEditor 在 group 和 ungroup 入口检查；命令成功前及 undo/redo 后验证完整结构。相同父级内调序不触发 release，允许必要部件 front/back。删除或移动整个复合节点不等于移出它的必要部件。核心没有具体插件名和派生 ID 分支。

## 读取与降级

SvgReader 先解析输入树，全局预留/检查显式 ID，再按原前序顺序补 ID 和 warning，最后后序恢复完整子树。`ShapeFactory.restore(ShapeRestoreInput)` 接收标签、ID、属性、文本和完整离线孩子。

仅 XML g 的 `data-kind` 用于语义路由。匹配已注册 provider 时必须支持完整 restore；结构损坏直接拒绝，不降级。没有相应 provider 时静默恢复为普通 g，移除该标记，保留孩子及合法样式。重复 ID 在路由前即拒绝；其余 data-*、叶子中的 data-kind、未知标签和非法属性仍按严格规则拒绝。XML 允许子元素的容器标签仍为 svg/g；这不是一般 XML 编辑器。

候选全部验证成功后 ReadCommand 才替换会话；失败保留文档、来源和历史。没有属性 handler 时使用容器默认属性能力，不代表没有 ShapeProvider，也不触发降级。

## 实际落点与替代方案

| 位置 | 责任 |
|---|---|
| src/core/application/ports/ShapeConstructionPort.ts、ShapeFactory.ts | 基础构建端口、完整恢复与通用 data-kind 路由 |
| src/core/domain/SvgGroup.ts、SubtreeBuilder.ts | 离线组装、结构策略和完整性 |
| src/core/domain/SvgDocument.ts、SceneEditor.ts | 挂接、删除、迁移、分组的统一保护 |
| src/core/domain/SvgNode.ts、SvgElementDescription.ts | 语义/显示/XML 的三个公开描述 |
| src/host/svg/SvgReader.ts、SvgWriter.ts | XML 适配，不导入具体插件 |
| plugins/builtin-commands/src/ReadCommand.ts | 完整候选成功后替换会话 |

拒绝在命令里按插件名禁止 delete/ungroup：有绕过路径且每增加插件都要改核心。拒绝逐节点语义恢复：复合 provider 会看到不完整部件。拒绝忽略所有 data-*：会无意放宽原严格输入规则。

验证：`test/extensions/composites.test.ts` 的 FixtureComposite/FixtureProvider 仅为测试替身，覆盖公开构建端口、离线失败、全子树冲突、必要部件保护、嵌套/附加孩子、整体操作与身份恢复、三身份、SVG 往返、损坏拒绝、降级和降级前重复 ID；原 reader/writer 回归及 final 字节回放保留。真实 box 和安装/禁用场景待 P2-4。
