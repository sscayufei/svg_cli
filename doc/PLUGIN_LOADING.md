# 插件装配与配置参考

默认内置六类图形和十九条命令，可选列表依次为stats、dir、box、tree-star。安装后先执行 `npm.cmd run build`，编译入口为 `dist/host/main.js`。设计说明和本轮测试填写位置见 [项目报告](README.md)。

## A：代码装配

不带--config时，`src/host/composition.ts` 的optionalPlugins提供 `{ module, plugin, options? }` 列表。plugin可以是无参类或实例；module用于找到同一包的package.json，不能用手写第二份清单绕过校验。内置包也通过PluginInstaller安装，列表顺序即注册顺序。

通过代码接入新插件时，仅在顶层composition追加import/条目及必要依赖，不修改core、loader、formatter或已有插件。插件包通过contributes声明四类贡献，使用core公开API。

## B：配置装配

```powershell
node dist/host/main.js --config plugins.config.json
```

```json
{
  "plugins": [
    { "module": "@svgframe/command-stats" },
    { "module": "@svgframe/command-dir" },
    { "module": "@svgframe/shape-box" },
    { "module": "@svgframe/tree-star", "enabled": true }
  ]
}
```

| 字段 | 规则 |
|---|---|
| plugins | 顶层唯一字段，必须是数组；空数组禁用全部可选插件 |
| module | 必填非空字符串，可以是包名、包目录或明确JS/MJS/CJS入口 |
| enabled | 可选布尔值，false时完全跳过解析、求值和激活 |
| options | 可选值，原样传给activate，由插件判断是否合法 |

显式配置替换A的可选列表，内置能力仍安装；列一个插件不会自动补上其余默认项。配置路径相对启动cwd，模块相对路径以配置目录为基准，包名遵守该目录的Node ESM解析上下文。目录由通用resolver解析exports/main，明确入口读取所属包清单；入口需先构建，不能借宿主manifest冒充插件清单。

设置tree-star的enabled为false只移除星号，box类型标签可独立保留。仅安装tree-star也可以标普通形状和SVG根，不依赖box。`options`没有项目统一业务含义，应按各插件文档提供。

## 清单与共同安装事务

package.json的contributes支持shapes、commands、decorators、attributes名称数组，缺省为空。名称集合必须与实际注册一致；同一类别内不允许重名。默认导出需为实现同步 `activate(context, options): void` 的类或实例。

配置先整体结构校验，再按顺序加载。A/B都进入共同安装器：暂存四注册表与休眠订阅 → activate → 方法、重名和集合校验 → 绑定资源并提交。当前插件失败则撤销全部暂存/部分已提交内容，释放资源，保留之前插件并继续之后插件；捕获重复注册异常仍不能让该事务有效。退出逆序释放成功插件资源，不提供热卸载。

activate仅注册贡献和可释放资源，不执行用户用例或修改文档；框架不回滚任意外部IO，也不是恶意插件沙箱。ctx.events订阅由安装器管理，其他dispose资源可由ctx.resources.add接管。

## 错误和继续运行

| 情况 | stderr |
|---|---|
| 顶层模块不存在 | `error: plugin not found: module` |
| 没有默认导出 | `error: plugin has no default export: module` |
| 清单与贡献不符 | `error: plugin manifest mismatch: name (declared: …, registered: …)` |
| 无效对象/构造/激活/options失败 | `error: plugin failed to activate: name (reason)` |
| 同类重名 | `error: duplicate registration: category/name` |
| 入口存在但依赖/求值/清单加载失败 | `error: plugin failed to load: module (reason)` |
| 参数、配置读取或结构错误 | `error: invalid plugin config`，仅使用内置能力启动 |

集合诊断按shapes/commands/decorators/attributes排列，类别内名称排序，实际注册顺序保持不变。内部依赖失败不误报顶层模块不存在；错误详情转换为单行，正常输出不修剪。

## 目录服务

ctx.directory表示启动目录，不要求SVG初始化，read/save不会改变它。NodeDirectoryAdapter读取直接Dirent并冻结name/kind，DirCommand完成过滤、分组排序和输出；不跟随链接或递归。排序、空目录、无副作用规则见 [dir README](../plugins/command-dir/README.md)。

## 可复用验证入口

```powershell
npm.cmd run build
npm.cmd test -- test/loading
npm.cmd test -- test/architecture
node scripts/verify-phase2-release.mjs
```

完整A/B工具使用默认四插件和根配置，六份会话在同一cwd顺序重置后执行，比较原始stdout/stderr和全部生成物；目录列表会话将日志/保存目标放在被列目录外。旧stats/commands/box/star回归plan仍由 `npm.cmd run verify:assemblies -- doc/transcript/plans/box.json` 等入口使用。

禁用可选插件的final兼容回放：

```powershell
$env:SVG_CLI_ENTRY='test/fixtures/entries/no-optional.mjs'
npm.cmd run verify:baseline
Remove-Item Env:SVG_CLI_ENTRY
```

Git接入核查使用真实revision，例如 `npm.cmd run verify:plugin-diff -- BEFORE AFTER --plugin plugins/new-feature --mode code`，BEFORE/AFTER需替换；config模式只允许配置入口，code模式只允许composition。此工具还验证唯一父提交、新包确实存在、根manifest仅依赖变化，peer参数可比较两份包；允许路径不替代对依赖/测试/文档的人工审阅。同时整合两个入口的提交应分别解释边界，不能把单模式报越界当作通过。

实际命令、失败修正与截图在 [项目报告第8节](README.md) 填写；旧机器运行记录仅在本地归档，不作为默认验证输入。安装决策见 [ADR004](adr/004-plugin-installation.md)、[ADR005](adr/005-public-api-and-host.md)。
