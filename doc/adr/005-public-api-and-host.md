# ADR 005：公开 API、宿主解析与构建边界

日期：2026-11-17。状态：P2-2c 本地框架验收通过，冻结 revision 待本轮普通提交确定。依据：D01、D02、D09、D10、D12。

## 边界与选择

core 仅导出 @svgframe/core 包根：领域节点/容器/局部记录、应用服务、四扩展点、只读场景、事件源、资源接管以及 SVG/Directory/Construction 端口。插件不导入 host、core 内部路径或其他具体插件。宿主负责 IO、装配、模块字符串解析和安装事务；core 不导入 Node、XML 库或具体插件。

PluginContext 的注册字段是 ExtensionRegistrations 窄接口；events 只提供 SessionEventSource（订阅/诊断），resources 只提供 ResourceOwner.add。宿主用真实 SessionEvents 发布，在暂存期用同接口代理资源；不把发布能力或底层注册恢复能力放进插件上下文。

DirectoryPort 包含只读 startup path 和直接 read()，返回冻结的 name/kind 值；NodeDirectoryAdapter 用 Dirent 区分目录/文件/链接/其他，不跟随链接、不递归、不改变 cwd，失败包含精确 path。排序、两空格、空目录与 help 属于后续 DirCommand；此阶段不提前实现 dir。两种装配共用 context.directory，单测可注入替身。

插件输出使用 CommandResult/lines/OperationFeedback，通用 formatter 只负责渲染；help 来自注册元数据。复合构建、结构策略、受控属性和 XML 描述不包含具体业务名。成功生命周期通知与标签组合详见 ADR 001～003。

## ESM 与清单归属

PluginModuleResolver 支持包名、包目录和明确的 JS/CJS/MJS 文件。包名以配置目录为父上下文，Node 原生 ESM resolver 处理 exports/import 条件；目录若有 exports 则通过包 self-reference 解析，其他目录使用 main 或 index.js。显式文件查找所属 package.json。相对路径转 file URL，覆盖中文、空格和盘符；不借用宿主根 manifest，不要求插件导出 package.json 子路径。

实际使用固定 Node 24.14.0 的 findPackageJSON 与 registerHooks：唯一临时 sentinel 在同步 import.meta.resolve 内改父 URL，finally 立即注销，不在钩子存活期间求值插件或 await。避免 require.resolve 的 require 条件漏掉 import-only exports，也避免给用户入口增加实验命令行参数。Windows 清单可能带扩展路径前缀，比较归属使用 realpathSync.native。

相关行为已核对 [Node 24.14.0 官方 module 文档](https://nodejs.org/download/release/v24.14.0/docs/api/module.html#moduleregisterhooksoptions) 并在本机/编译后入口实测；未来升级 Node 时须重跑解析回归。默认导出和激活校验发生在解析/求值之后，不通过捕获任意 MODULE_NOT_FOUND 误判内部依赖失败。

## 构建、证明与冻结

workspaces 动态发现，按本地依赖拓扑构建，最后构建 host；清理 dist 前验证路径在指定工作区内。--root 仅用于隔离构建验证，不把临时包加进真实仓库。未知名称 fixture 证明新增包不需要 loader/构建名称映射，编译后 ESM 可直接配置加载。

verify:assemblies 在同一生成 cwd 依次重置 fixture，直接 node 启动 A/B，共用 bootstrap，比较原始 stdout/stderr 和生成文件，不规范化输出。verify:plugin-diff 读取真实 Git 树，确认新包存在且此前不存在，限制 A 的已有运行改动只在 composition，B 只在配置；依赖元数据/测试/文档需继续人工解释。peer 参数比较两份插件内容。

metrics 只读取指定 Git revisions，按版本化职责映射分类并用 TS7 scanner/AST 计数；CLI 总量和 VSCode 单列。首次输出 final→4a4ed73，明确不包含未提交工作区。冻结 SHA 在用户审阅本轮提交后确定，再用同一工具输出到该 SHA 的报告；后续插件接入前先登记该基线，不能把前置提交冒充冻结提交。

替代方案：不使用跨包相对 import、不手写插件名称分派、不让 tsx 掩盖未构建入口；不以工作区估算替代 Git 历史指标，不用最终合并提交替代 A/B 的独立接入证据。

验证位置：architecture/dependencies、loading、NodeDirectoryAdapter、tools/framework-tools 测试；三份 final 字节回放；真实前后 [PlantUML 图](../architecture/phase2-framework.svg)。真实 stats/dir/box/star、最终指标及接入提交证据仍按后续阶段补齐。
