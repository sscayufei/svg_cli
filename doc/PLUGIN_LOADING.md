# 插件装配、配置与验证

框架已冻结于 1ff4352，保留六种形状和十九条内置命令；当前整合工作区的默认代码装配及根配置另按顺序启用独立 stats、dir、box、tree-star。新机器先 npm ci 和 npm run build；运行入口为 dist/host/main.js。

## A：代码装配

只在 src/host/composition.ts 导入新增插件并修改 optionalPlugins()，返回 `{ module, plugin, options? }` 列表。plugin 是默认导出的无参类或实例，module 指向同一包，installer 仍从其 package.json 读取清单并校验。列表顺序即安装顺序；没有 --config 时使用此列表。内置包也通过同一个 installer。

后续接入提交还需说明必要依赖元数据，不能修改 loader、core、formatter 或已有插件。这个阶段自身是框架重构，不能作为新增业务插件零修改证明。

## B：配置装配

```powershell
node dist/host/main.js --config plugins.config.json
```

配置格式如下（模块名称是格式示例，不代表仓库已经包含这些包）：

```json
{
  "plugins": [
    { "module": "@vendor/feature", "options": { "value": "example" } },
    { "module": "./plugins/another-feature", "enabled": false }
  ]
}
```

根仅接受 plugins 数组，条目仅接受 module、enabled、options。module 必须是非空字符串，enabled 如出现必须是布尔值；options 原样传入 activate，由插件验证。结构校验在加载任何条目前完成。

显式配置替换 A 的可选列表，内置能力始终安装。enabled:false 完全跳过解析和求值。配置文件相对启动 cwd；相对模块以配置文件目录为基准，包名按该目录的 Node ESM 上下文解析。包目录支持 exports 或 main/index.js，明确的 .js/.mjs/.cjs 入口使用所属包的清单，入口必须已构建。根 plugins.config.json 当前与 A 一致，按 stats、dir、box、tree-star 顺序配置；无扩展兼容回放固定使用 test/fixtures/entries/no-optional.json。

package.json 的 contributes 支持 shapes、commands、decorators、attributes 四类名称数组，缺省均为空；名称集合须与实际注册一致。接口实现使用类/实例，四类在各自名称空间中重名即拒绝。默认导出类由宿主无参构造，实例需提供同步 activate(ctx, options):void。

当前真实 stats 配置示例为 doc/transcript/inputs/stats.plugins.json（模块 @svgframe/command-stats），只提供 stats；默认 A 与根 plugins.config.json 提供 stats、dir、box、tree-star。`node dist/host/main.js --config test/fixtures/entries/no-optional.json` 禁用全部可选贡献，仍保留内置十九条命令和六种形状。

联合命令配置为 doc/transcript/inputs/commands.plugins.json，仅按 stats、dir 顺序提供两条命令；box 配置为 doc/transcript/inputs/box.plugins.json，提供 stats、dir、box，保留原 box 会话的无星预期。完整双标签配置为 doc/transcript/inputs/star.plugins.json，增加 tree-star，集合/顺序/options 与当前默认 A 一致。只列其中一个或用 enabled:false 可独立禁用另一个；help 由实际注册集合生成。

tree-star 只贡献 modified-star 装饰器，注册在 box-type-label 之后；树行组合为 `g#p (box) *`。它按最近成功 init/read/save 的公开内容快照比较，undo 回保存内容消星；新节点及变化祖先标星，失败保存/查询/dir 不清星，画布尺寸变化只标根。状态封装在每个实例，退出和安装失败释放暂存订阅，不依赖 box。可在启用 box 的同时禁用 tree-star，类型标签保留。详见 [tree-star README](../plugins/tree-star/README.md)。

## 错误和资源边界

| 情况 | stderr（后续仍接受 CLI 输入） |
|---|---|
| 顶层模块找不到 | error: plugin not found: module |
| 没有 default | error: plugin has no default export: module |
| 清单不一致 | error: plugin manifest mismatch: name (declared: …, registered: …) |
| 无效默认对象、构造/激活/非法 options | error: plugin failed to activate: name (reason) |
| 重复注册 | error: duplicate registration: category/name |
| 入口存在但依赖/求值失败，或清单/入口不合法 | error: plugin failed to load: module (reason) |
| 参数或配置不可读/语法/结构错误 | error: invalid plugin config；仅使用内置能力启动 |

清单集合按 shapes、commands、decorators、attributes 排列，每组名称排序；真实注册顺序保持不变。错误详情会转成单行，stdout 不过滤或修剪。

activate 仅注册及建立可释放资源，不执行用户用例或修改文档。四注册表与事件订阅先暂存，全部校验后提交；捕获重复注册错误也不能使该事务重新有效。通过 ctx.events.subscribe 获得订阅，通过 ctx.resources.add 接管其他 `{dispose()}` 资源；失败清理当前插件，保留前面的插件，继续后面的插件。EOF/退出时逆序释放成功插件资源，不做热卸载。

ctx.directory 是启动目录服务，不要求 SVG 已初始化，read/save 不改变它。只有 Adapter 访问 Node 文件系统，DirCommand 通过公开 DirectoryPort 使用；排序和格式化属于命令。

DirCommand 已在独立 command-dir 包接入：客户端只读 DirectoryPort，生产 NodeDirectoryAdapter 把 Node readdir/Dirent 适配为冻结的 name/kind；命令处理排序和输出。目录/文件/链接/其他依次分组，组内大小写敏感的 JS 字符串序；标记 [DIR]/[FILE]/[LINK]/[OTHER] 后两个空格，隐藏项保留，. 和 .. 排除，不递归或跟随链接。空目录固定 `(empty directory)`，读取失败包含端口 path；查询不触发模型/历史/保存点观察状态变化。详见 [dir README](../plugins/command-dir/README.md)。

## 验证工具

```powershell
npm.cmd run build:all
npm.cmd run check:tests
npm.cmd test
npm.cmd run verify:baseline
npm.cmd run metrics -- final HEAD --output docs/metrics/current
```

metrics 使用真实 Git blob，提供完整 SHA、文件职责、物理/代码行数、函数明细和复杂度增量。运行前先提交待统计源码；脚本不会暗中创建提交或把未提交文件算入历史。口径与首轮结果见 [metrics 说明](../docs/metrics/README.md)。

stats 的真实 A/B 回放可直接运行 `npm.cmd run verify:assemblies -- doc/transcript/plans/stats.json`。无扩展 final 基线应把 SVG_CLI_ENTRY 设为 test/fixtures/entries/no-optional.mjs，再运行 verify:baseline；此测试 wrapper 只调用冻结 bootstrap 和相邻的独立空配置，不修改 loader 或基线脚本，也不依赖未来根演示配置的内容。它确保比较条件是禁用可选插件，而不是带新增 help 的默认 A。

联合 stats/dir 回放运行 `npm.cmd run verify:assemblies -- doc/transcript/plans/commands.json`，两侧同一直接 node 入口；seed 在每轮前复制到同一 cwd，保存目标及日志在被列目录外。stats-only 的旧 plan 使用显式测试入口提供仅 stats 的 A 列表，避免后来新增 dir 改变它的比较集合；原语义/错误预期保持不变。

实际根配置回放为 `npm.cmd run verify:assemblies -- doc/transcript/plans/commands-root-config.json`。此基线验证共同命令。box 完整功能回放为 `npm.cmd run verify:assemblies -- doc/transcript/plans/box.json`，A 显式测试入口与 B 同装 stats/dir/box，以便同一测试在两份证明提交运行。

box 真实独立证明已完成：F=f5236b5；C_A=f20745a（phase2/box-a-f5236b5）仅改 composition 接入；C_B=9a8aeb6（phase2/box-b-f5236b5）仅改根配置接入，两者父提交均为 F、box 包完全相同。另用两个隔离工作区的真实 main + B 根配置逐字节比较两流和两份 SVG，区别于通用功能测试入口。P2-4 已整合提交1d1b646，两份本地证明分支保留可达。完整 SHA、命令及证据见 [P2-4 报告](../docs/phase2/P2-4_REPORT.md)。

双标签回放为 `npm.cmd run verify:assemblies -- doc/transcript/plans/star.json`，A 直接启动当前真实 main，B 同一 main 配合 star.plugins.json 的插件目录加载。两流、两SVG及固定目录树逐字节比较通过；并与手工预期核对。默认 A/根配置 B 的四插件与贡献顺序另有集成测试。tree-star 当前尚未提交，本地边界和回放不冒充实际接入SHA，后续提交后补差异/历史指标，见 [P2-5 报告](../docs/phase2/P2-5_REPORT.md)。

`npm.cmd run verify:assemblies -- plan.json` 的 plan 包含 codeEntry、configEntry、configPath、transcript 和可选 fixtureDirectory，路径均相对 plan 文件。两入口都直接 node 运行并使用同一 bootstrap；B 追加 --config。工具在 .tmp/phase2 生成同一 cwd，A/B 顺序执行，日志位于 cwd 外，逐字节比较两个输出流与生成文件。复制后的 fixture 在每轮前重置；链接按链接内容记录，不跟随。fixture A/B 已验证 options、错误流与 SVG 字节，后续业务会话继续复用。

```powershell
npm.cmd run verify:plugin-diff -- BASE COMMIT --plugin plugins/new-feature --mode code
npm.cmd run verify:plugin-diff -- BASE COMMIT --plugin plugins/new-feature --mode config --peer OTHER_COMMIT
```

BASE/COMMIT/OTHER_COMMIT 替换为真实 revision。工具校验 COMMIT 的唯一父提交为 BASE、新包 package.json/src 存在且此前不存在、已有运行代码路径限制和可选 peer 内容一致性。根 package.json 仅允许依赖字段变化，禁止在 scripts 等字段藏运行改动；锁文件、依赖和测试/文档仍需人工说明。它不替代架构扫描和运行回放。

两种装配与目录 Adapter 的实际职责见 [ADR 004](adr/004-plugin-installation.md)、[ADR 005](adr/005-public-api-and-host.md)。
