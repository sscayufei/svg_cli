# ADR 003：生命周期、内容差异与标签组合

日期：2026-11-17。状态：通知/快照/组合基础已实现（P2-2b），box类型标签已交付（P2-4），modified-star与双标签完成并提交360fac0；P2-6已补实际接入差异/历史指标及干净环境复验。来源：D06、D07。

## 问题与选择

“有过编辑”或“有 undo 栈”不能等价于脏状态：设置同值不变脏，undo 回保存内容应消星，canvas 改变会清历史却仍可能变脏。选择比较最近成功 save/read（或 init 空画布）的内容；状态由每个标签插件实例私有持有，不放进历史。

`EditorSession.snapshot()` / `SceneQuery.scene()` 提供复制冻结的场景：画布、根孩子顺序、节点 ID/语义/显示类型、容器身份、父引用、孩子顺序、几何、显式属性（包括文本）。来源路径单列；内容比较不包含路径或对象引用。快照仅供观察与重建缓存，不承担 undo。

`SessionEvents` 提供同步只读通知及可重复 dispose 的订阅。事件为 init/read/save/canvas/edit/undo/redo，携带提交后的 SessionSnapshot。CommandHistory 在成功记栈、清栈屏障或移动双栈后发出事件；Executor 把文档命令的 lifecycleEvent 传给屏障。canvas 查询是 query，没有事件；失败操作也没有事件。不能把所有 document 事件当成保存。

观察者逐个隔离；快照投影失败也单独记录于 `SessionEvents.diagnostics`，不把已成功操作或已经写出的文件改判失败。诊断是单独可读通道，不混入 CLI 正常输出。订阅没有跨会话全局状态。观察者应仅更新自身缓存，不重入命令执行或直接改变模型。

## 标签协议与算法

TreeDecorator 接收冻结的 TreeRow，根和可见节点均可附加后缀。SceneQuery 按注册顺序调用；NodeFormatter 用一个空格连接非空后缀，空后缀不改变基础行。装饰器不读取或调用其他装饰器。

P2-5 的正式插件比较节点语义/显示/容器身份、几何/显式属性/父归属/孩子顺序及画布/根顺序；变化向当前祖先与 SVG 根传播，删除和移出由旧祖先的孩子序列体现。新节点立即标星，undo或普通编辑回基线消星，redo按当前内容重新比较。成功 save/read/init 更新基线，canvas 仅重新比较；失败保存不更新，query/dir 不更新。box 类型标签在星号前注册。

P2-4 已交付 `plugins/shape-box/src/BoxTypeDecorator.ts`：decorate 只匹配语义 box 的容器行并返回 `(box)`，不标普通 g 或 SVG 根，不订阅事件、无可变状态。BoxPlugin 注册 `box-type-label`；SceneQuery 与 NodeFormatter 保持冻结。真实讲义/读回会话验证类型标签，单包用假星号验证 `(box) *` 顺序，后者不是 modified-star 的完整状态机或接入证据。见 [P2-4 报告](../../docs/phase2/P2-4_REPORT.md)。

P2-5 实际落点为 `plugins/tree-star/src/ModifiedStarDecorator.ts` 的 observe/decorate/rootSignature/nodeSignature：基线根/节点签名、dirty集合和根状态均是实例私有字段；几何/属性键排序，显式属性缺席不等于显式赋值，路径/对象身份/历史位置不参与。孩子调序标父容器，根调序或单纯画布变化只标根；迁移标旧父、新父和节点，未变化后代不额外标记。祖先传播迭代执行，已访问路径不重复展开。基线与缓存用于观察，不用于undo。

`plugins/tree-star/src/TreeStarPlugin.ts` 的 activate 每次创建独立装饰器，以当前会话内容建立初始干净基线，通过 context.events 订阅；安装器管理暂存/退出释放，无需改核心。正常CLI在init/read前安装；直接领域写操作若绕过执行器/历史通知，不构成完整应用执行流程。两装饰器互不调用，box完整包未修改。见 [P2-5 报告](../../docs/phase2/P2-5_REPORT.md)。

## 实际落点与替代方案

| 位置 | 责任 |
|---|---|
| src/core/application/SceneSnapshot.ts、SceneQuery.ts | 值快照、顺序和树装饰投影 |
| src/core/application/EditorSession.ts、SessionEvents.ts | 会话快照、事件、释放与异常诊断 |
| src/core/application/CommandHistory.ts、CommandExecutor.ts | 操作成功并提交历史后通知 |
| plugins/builtin-commands/src/InitCommand.ts、ReadCommand.ts、SaveCommand.ts、CanvasCommand.ts | 区分四种文档生命周期 |
| src/core/extensions/PluginContext.ts、src/host/composition.ts | 提供同一会话 events，并将 history 绑定到 events |
| src/host/cli/NodeFormatter.ts | 通用后缀组合（P2-2a 已实现） |

拒绝用编辑计数或历史位置作为唯一 dirty 定义；拒绝把具体标签判断加进渲染器；拒绝观察者异常使成功保存失败。这里是装饰管线，与经典同接口对象包装式 Decorator 的差异保留在报告中。

验证：`test/extensions/lifecycle.test.ts` 覆盖七类事件、提交后栈状态、查询/失败无事件、值快照不可变、dispose、观察者异常与成功保存隔离、多会话、同值编辑/保存点/undo/redo/分叉/失败保存/canvas 的测试基线及假标签；`contracts.test.ts` 覆盖根、子树与顺序组合。P2-5新增独立 `plugins/tree-star/test/modified-star.test.ts` 22项状态机及 `test/integration/tree-star.test.ts` 12项真实集成，覆盖各比较字段、2500层祖先、真实失败IO/查询/编辑保留历史、双标签、安装失败实际订阅释放和退出释放。P2-6在360fac0干净副本复验399项、raw A/B和final字节回放，并补 [实际提交差异](../evidence/phase2/p2-5-committed-diff.json) 与 [历史增量](../../docs/metrics/tree-star-integration.md)。
