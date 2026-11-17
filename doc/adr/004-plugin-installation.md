# ADR 004：清单校验与插件安装回滚

日期：2026-11-17。状态：P2-2c 通用安装路径已实现，业务插件的接入提交证明待后续阶段。依据：D08、D09。

## 选择与原因

代码装配 A 和配置装配 B 都进入宿主的 PluginInstaller。A 从 composition 提供已导入的类/实例，B 根据模块字符串加载默认导出；两者都从同一个包的 package.json 读取 contributes，不能复制第二份手写声明后绕过校验。

安装按以下顺序完成：读取/验证清单 → 创建四类暂存注册表及资源作用域 → 同步 activate(ctx, options) → 检查注册错误与贡献集合 → 绑定暂存订阅 → 按类别提交注册。四类缺省为空，比较类别与名称集合，诊断固定 shapes、commands、decorators、attributes 顺序，名称排序；实际调用/显示顺序保持注册顺序。

暂存表读通此前成功插件与本插件暂存项，写入只落在本插件。重复名、非法接口使事务失效，即使插件捕获注册异常也不能提交。注册表 registerBatch 先验证候选 Map，再切换状态并返回精确恢复收据；后一类别提交失败时，逆序恢复前面类别。因此保证的不只是 activate 抛错时清理暂存。

ctx.events 的订阅在提交前休眠，ctx.resources.add 接管其他可释放资源。任何失败均释放该插件订阅/资源，保留之前插件，允许之后插件加载。清理按逆序执行，单个 dispose 异常不阻止其余资源释放，异常通过独立 diagnostics 保留。成功安装的资源由应用在 EOF/退出时释放，不提供运行时热卸载。

插件默认导出支持无参构造的类或有 activate 方法的实例；activate 必须同步且返回 void。options 原样传入，由插件验证。激活只注册/建立资源，不修改当前文档；框架不回滚任意外部 I/O，也不是恶意插件隔离沙箱。

## 入口、错误与替代方案

配置先整体结构校验，再按数组顺序逐个加载。enabled:false 完全不解析/求值。无 --config 使用代码列表；显式配置不可读或不合法时，仅启用内置能力，并报告 invalid plugin config。错误经 bootstrap 写 stderr，带 error:；插件不得自行输出。

顶层模块找不到、没有默认导出、清单不符、激活失败保留需求指定格式。同类重名使用 duplicate registration。入口存在但内部依赖或求值失败使用 plugin failed to load，避免误报为顶层未找到。错误详情中的换行规范为单行，正常 CLI 输出不经过过滤。

拒绝 activate 直接写 live 注册表后再只删除一个名称：有跨类别、部分注册与订阅残留。拒绝 A 直接 activate 而 B 才校验：无法形成一致的接入判据。拒绝依赖安装顺序偶然正确：构建按工作区依赖拓扑执行。

## 实际位置与验证

| 文件 / 方法 | 责任 |
|---|---|
| host/loading/PluginInstaller.install / dispose | 共同安装、完整提交/恢复与退出释放 |
| host/loading/StagedRegistry | 读通、暂存、错误锁存、提交收据 |
| core/extensions/ExtensionRegistry.registerBatch | 单类别候选校验和精确恢复原语；插件上下文只暴露窄注册接口 |
| host/loading/PluginResources | 暂存订阅与可释放资源、清理异常隔离 |
| host/loading/PluginManifestReader | 清单结构及确定的集合描述 |
| host/loading/PluginConfiguration、PluginLoader | 整体配置校验与有序逐项加载/继续 |
| host/composition、bootstrap、main | 默认内置、A/B 选择、统一 REPL/输出 |

路径前缀 core=src/core，host=src/host。`test/loading/PluginInstaller.test.ts` 覆盖四贡献、回滚、前后插件可用、内部/外部重名、捕获错误后仍拒绝、集合排序、默认导出、异步拒绝、资源绑定失败与后类别提交失败；`PluginLoader.test.ts` 覆盖各加载失败、路径、禁用、options 和真实编译入口。正式业务插件与 A/B Git 接入 SHA 不能由这些 fixture 替代。
