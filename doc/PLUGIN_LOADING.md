# 插件装配、配置与验证

P2-2c 已实现通用框架；仓库当前仅默认安装六种形状和十九条内置命令，没有默认可选业务插件。新机器先 npm ci 和 npm run build；运行入口为 dist/host/main.js。

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

显式配置替换 A 的可选列表，内置能力始终安装。enabled:false 完全跳过解析和求值。配置文件相对启动 cwd；相对模块以配置文件目录为基准，包名按该目录的 Node ESM 上下文解析。包目录支持 exports 或 main/index.js，明确的 .js/.mjs/.cjs 入口使用所属包的清单，入口必须已构建。根 plugins.config.json 当前为显式空配置，可用于兼容回放。

package.json 的 contributes 支持 shapes、commands、decorators、attributes 四类名称数组，缺省均为空；名称集合须与实际注册一致。接口实现使用类/实例，四类在各自名称空间中重名即拒绝。默认导出类由宿主无参构造，实例需提供同步 activate(ctx, options):void。

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

ctx.directory 是启动目录服务，不要求 SVG 已初始化，read/save 不改变它。只有 Adapter 访问 Node 文件系统，未来 DirCommand 通过公开 DirectoryPort 使用；排序和格式化属于命令。

## 验证工具

```powershell
npm.cmd run build:all
npm.cmd run check:tests
npm.cmd test
npm.cmd run verify:baseline
npm.cmd run metrics -- final HEAD --output docs/metrics/current
```

metrics 使用真实 Git blob，提供完整 SHA、文件职责、物理/代码行数、函数明细和复杂度增量。运行前先提交待统计源码；脚本不会暗中创建提交或把未提交文件算入历史。口径与首轮结果见 [metrics 说明](../docs/metrics/README.md)。

`npm.cmd run verify:assemblies -- plan.json` 的 plan 包含 codeEntry、configEntry、configPath、transcript 和可选 fixtureDirectory，路径均相对 plan 文件。两入口都直接 node 运行并使用同一 bootstrap；B 追加 --config。工具在 .tmp/phase2 生成同一 cwd，A/B 顺序执行，日志位于 cwd 外，逐字节比较两个输出流与生成文件。复制后的 fixture 在每轮前重置；链接按链接内容记录，不跟随。fixture A/B 已验证 options、错误流与 SVG 字节，后续业务会话继续复用。

```powershell
npm.cmd run verify:plugin-diff -- BASE COMMIT --plugin plugins/new-feature --mode code
npm.cmd run verify:plugin-diff -- BASE COMMIT --plugin plugins/new-feature --mode config --peer OTHER_COMMIT
```

BASE/COMMIT/OTHER_COMMIT 替换为真实 revision。工具校验 COMMIT 的唯一父提交为 BASE、新包 package.json/src 存在且此前不存在、已有运行代码路径限制和可选 peer 内容一致性。根 package.json 仅允许依赖字段变化，禁止在 scripts 等字段藏运行改动；锁文件、依赖和测试/文档仍需人工说明。它不替代架构扫描和运行回放。

两种装配与目录 Adapter 的实际职责见 [ADR 004](adr/004-plugin-installation.md)、[ADR 005](adr/005-public-api-and-host.md)。
