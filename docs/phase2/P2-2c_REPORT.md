# P2-2c：加载器、双装配、目录端口与框架冻结准备

日期：2026-11-17。开始时 HEAD 为 `4a4ed731bc162ac5afceae942e7d423088ad41d2`（P2-2b），工作区干净。状态：本地实现与验收完成，待审阅提交；本轮普通提交将确定框架冻结 SHA，当前不虚构该 SHA。

## 实现

默认内置及 A/B 均调用 PluginInstaller。A 由 composition.optionalPlugins 提供类/实例与模块元数据位置；B 由 --config 指定有序模块列表，替换 A 可选列表，始终保留内置能力。main/bootstrap 共用同一个 CLI/输出流程，根 plugins.config.json 当前为空列表。

安装先暂存四注册表、订阅和其他可释放资源，再调用同步 activate。匹配清单集合、校验重复与方法/help 契约后提交；类别顺序和名称诊断确定。暂存注册错误会锁存，插件捕获异常也不能提交。核心 registerBatch 先验证候选 Map，并返回恢复收据，覆盖后类别提交失败时前类别的恢复。失败插件资源逆序释放，清理异常隔离，前后插件仍可用；EOF/退出释放成功插件资源。

PluginModuleResolver 通用处理包名、相对/绝对包目录、显式 JS 入口及包归属。使用 Node ESM 原生条件解析 import-only exports，清单发现不要求 package.json 子路径导出。临时同步钩子用后立即注销；路径转 file URL，测试覆盖中文/空格/其他启动 cwd。顶层找不到与内部依赖/求值失败分开报告，禁用项完全不解析。配置先整体校验，错误时只使用内置能力继续交互。

DirectoryPort 与 NodeDirectoryAdapter 提前就位，捕获启动目录、读取直接条目、区分链接且不跟随、不递归、不 chdir，返回冻结值。测试替身可替换该服务，尚未 init 也可调用。read/save 不改变目录。dir 命令、排序与用户输出留在 P2-3b。

验证工具：verify:assemblies 顺序运行 A/B，共用生成 cwd 与 fixture，比较 raw stdout/stderr 和生成文件；verify:plugin-diff 检查实际 Git 树、新包存在性、允许变更边界及可选 peer 内容；metrics 从 Git blob 用版本化分类和 TS7 scanner/AST 统计，不手填数字。构建增加隔离 --root 测试入口，验证未知工作区依赖拓扑、编译产物及运行加载，无具体插件名映射。

## 变更边界与实际位置

| 类别 | 文件/目录 |
|---|---|
| 公共契约 | src/core/extensions 的窄注册接口、PluginContext；SessionEventSource/ResourceOwner；ports/DirectoryPort |
| 原子注册 | ExtensionRegistry.registerBatch；host/loading/StagedRegistry、PluginInstaller、PluginResources |
| 配置/模块 | host/loading/PluginConfiguration、PluginManifestReader、PluginModuleResolver、PluginLoader |
| 默认与启动 | host/composition、bootstrap、main；plugins.config.json |
| 目录 Adapter | host/filesystem/NodeDirectoryAdapter |
| 工具 | scripts/build-workspaces、verify-assemblies、verify-plugin-diff、metrics、lib/source-metrics、metrics-rules |
| 验证 | test/loading、test/tools、NodeDirectoryAdapter.test、architecture/dependencies |
| 文档 | doc/PLUGIN_LOADING、ADR004/005、扩展点清单、architecture；docs/metrics、phase2 状态同步 |

旧能力保持，具体命令包仅调整 help 使用会话中的动态形状服务，兼容显式注入服务的独立装配；包测试上下文补目录/资源端口。没有新增第三方依赖或改锁文件，root package 仅增加工具 scripts。没有实现真实 stats/dir/box/star，也没有用 fixture 冒充业务插件接入。

## 实际验证

| 命令/验证 | 结果 |
|---|---|
| npm.cmd run build:all | core/内置包/host/扩展干净构建通过；最终注册补强后另行重跑 CLI/core build |
| npm.cmd run check:tests | 全部主测试源码严格类型检查通过 |
| npm.cmd test | 34 文件 / 286 项通过，相比 P2-2b 增加 29 项；含内置包独立测试与架构约束 |
| npm.cmd run test:extension:unit | 8 项通过 |
| npm.cmd run verify:baseline | 最终三份会话与 final stdout/stderr/文件字节完全一致 |
| fixture A/B 回放 | 同一插件实现/清单/options、直接 node/同一 bootstrap；正常流、错误流与 SVG 字节一致；改变 options 时工具正确拒绝 |
| 未知 workspace | 隔离目录自动发现/拓扑构建成功，编译 ESM 入口可按目录配置加载 |
| Git 差异工具 | 隔离 Git fixture 验证允许配置接入、拒绝 loader/根 scripts 改动、检查唯一父基线、拒绝 peer 实现不同及不存在新包 |
| npm.cmd run metrics -- final HEAD --output docs/metrics/p2-2c-initial | 从 final 与已提交 4a4ed73 生成 JSON/Markdown，含职责/行数/函数和顶层复杂度 |
| PlantUML | 1.2024.3 实际渲染前后 SVG，另渲染 PNG 检查可读性 |

Windows 沙箱阻止子进程的命令按授权重跑通过。扩展源码/依赖未改，本阶段未重跑真实 GUI/Extension Host、VSIX 安装和截图；此前证据保留，不把旧运行算成本次运行。

证据：[验证摘要](../../doc/evidence/phase2/p2-2c-checks.json)、[final 回放摘要](../../doc/evidence/phase2/p2-2c-baseline.json)、[fixture A/B 摘要](../../doc/evidence/phase2/p2-2c-assemblies.json)、[历史指标](../metrics/p2-2c-initial.md)。前图基于 final 实际目录，后图基于本轮实际源码：[final](../../doc/architecture/final.svg)、[P2-2c](../../doc/architecture/phase2-framework.svg)，相邻 .puml 为可编辑源码。

## 需求、错误与检查修正

- L-01/L-02：共同 installer、四类贡献集合、重复/部分注册/订阅回滚、默认导出与四类指定失败、前后插件继续可用；补齐提交阶段失败恢复，未只比较注册数量。
- L-03：目录/包名/import-only exports/显式入口、清单归属、中文空格、其他 cwd、禁用不求值、依赖/求值错误分类及编译后 Node 运行。
- C-03/Q-01 的框架前置：DirectoryPort/真实 Adapter/替身/初始化前可用/read-save cwd 不变；正式 dir 验证在 P2-3b。
- F-02/F-03/Q-02：旧会话字节兼容、完整扩展点清单、ADR001～005、前后图、历史指标和工具样本测试。
- G-01：只完成工具与隔离 fixture，不声称真实新增业务插件已有接入提交证据。

核验并修正的建议：require.resolve 使用 require 条件会漏掉 import-only 包，改为原生 ESM 条件解析；Windows 扩展路径前缀需 native realpath；不能让 A 绕过清单/回滚；暂存重复错误需要锁存；仅暂存不等于提交也原子，故增加批量候选与恢复收据。未知工作区烟测发现 TS7 要求显式 rootDir，修正 fixture 配置，未放宽生产编译检查。指标按真实 Git 历史，不将未提交工作区冒充 HEAD。

## 冻结与后续

本地框架能力及退出验证就绪。用户审阅提交本轮后，以实际 P2-2c 源码提交作为冻结 SHA；首次指标当前只到前置提交 4a4ed73，清楚排除未提交本轮代码。下一轮接入业务插件前应读取该冻结 SHA，重跑 `npm.cmd run metrics -- final <冻结SHA> --output docs/metrics/framework-freeze`，将生成报告作为普通文档变更保存。无需修改运行源码来补指标，不创建额外过程 tag。

下一开发阶段为 P2-3a：stats 独立命令插件。此后新增插件原则上只增加自身包、必要依赖元数据、获准的 composition/config、测试和文档；若框架遗漏，先单独修正并更新冻结 SHA，再做干净接入证明。

建议提交：`feat(host): load plugins transactionally and freeze extension framework`。本轮未对项目执行 git add/commit/push/tag。测试工具只在 .tmp 下隔离的合成 Git 仓库创建测试提交，与本项目历史无关。
