# @svgframe/tree-star

独立 `modified-star` 树装饰器，只依赖 `@svgframe/core` public。不依赖 box、命令包或宿主，不修改模型/历史，不输出日志。默认导出无参 TreeStarPlugin 类，清单只贡献 decorators/modified-star。

采用内容差异：最近成功 save/read 建立基线，init 建立空画布基线；新节点立即标 `*`。比较节点语义/显示/容器身份、几何、显式属性（含文本和属性缺席）、父归属和孩子顺序，以及根顺序/画布。属性键排序后比较，不把键插入顺序、文件路径、对象身份或 undo 栈位置算作变化。undo 回基线或普通编辑回原内容会消星；redo 再次标记。

变化向当前祖先和 SVG 根传播；删除/移出由旧祖先的孩子序列体现。调序标所属容器（根调序只标根），不使未改变的孩子变脏。画布尺寸变化只标根。失败编辑/read/save/init、查询、dir 均不更新基线。另存成功清星，失败保存保留星号和原有历史。

ModifiedStarDecorator 实例私有保存基线签名和 dirty 缓存，无模块级状态。每次成功编辑/undo/redo/canvas 事件从只读快照重建比较，祖先传播为迭代过程、无深度递归；缓存不承担撤销。插件激活时以当前会话内容为初始干净基线，正常 CLI 在 init/read 前安装。直接改模型并绕过执行器/历史通知不属于完整应用执行流程。

TreeStarPlugin 为每次激活创建新装饰器，通过安装器管理的 context.events 建立暂存订阅，安装失败或应用退出自动释放。decorate 是只读缓存查询，不重入命令、不修改状态。同一插件对象用于不同会话也不会共享 dirty 状态。

装饰器互不调用。默认装配把它注册在 box-type-label 后，形成 `g#p (box) *`；没有 box 时也能独立标普通形状和根。显式配置替换默认可选集合，禁用本插件即不显示星号，box 类型标签可独立保留。禁用全部可选插件时保留 final 原始 tree 输出。

```powershell
npm.cmd run build
npm.cmd test --workspace @svgframe/tree-star
node dist/host/main.js --config doc/transcript/inputs/star.plugins.json
npm.cmd run verify:assemblies -- doc/transcript/plans/star.json
```

单包测试只用 core 类型和合成只读场景验证状态机；根 `test/integration/tree-star.test.ts` 使用真实命令、形状、文件 IO、安装器和 A/B CLI 回放，验证失败不通知、保存点、历史、双标签、资源释放和独立禁用。实例基线以公开快照的值为准；显式属性与属性缺席不同，不比较序列化后可能省略的冗余表示。
