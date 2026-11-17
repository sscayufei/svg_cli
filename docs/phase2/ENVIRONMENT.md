# Phase 2 开发环境与基线核查

核查日期：2026-11-16，Windows / PowerShell，工作区 `D:\software_design\svg_cli`。以下区分实测结果、选定方案和待执行准备；工具存在不等于扩展已完成安装/运行测试。

> P2-0 执行更新：下文最初核查中标记“未安装/未开始”的工具准备，现已完成固定依赖安装、扩展构建/宿主烟测、原始字节基线工具。最新实际命令和结果以 [P2-0_REPORT.md](P2-0_REPORT.md) 为准；本轮未引入 vsce、未生成 VSIX。真实宿主为 VSCode 1.143.1 / Node 24.21.0 / Electron 43.7.7。

> P2-1b 更新：已安装 vsce 4.1.1，完成扩展 0.2.0 的 VSIX 打包及仓库外隔离安装测试；相同宿主环境中验证大纲定位、更新与错误恢复。见 [P2-1b 记录](P2-1b_REPORT.md)。以下保留原始核查与阶段准备口径。

> P2-2a 更新：core 与两个内置插件已成为本地工作区包，使用包 exports 的编译产物。新增机器准备不需要第三方依赖；首次 npm ci 后先 npm run build。build:all 包含扩展，check:tests 检查测试源码，test:all 汇总主测试/扩展单测/宿主。TypeScript 7 AST 扫描使用其原生快照 API，不能照搬 TS 5 的 createSourceFile。详见 [P2-2a 记录](P2-2a_REPORT.md)。

> P2-2b 更新：前置提交 dc27435，未增加依赖/脚本或更改锁文件。全量构建、测试源码检查、257项主测试、扩展8项单测及三份 final 字节回放通过。Windows 沙箱拦截子进程时按授权重跑；本阶段未重跑真实 GUI/VSIX 安装。事件订阅由会话实例提供，独立装配应把 session.events 注入 CommandHistory。详见 [P2-2b 记录](P2-2b_REPORT.md)。

## 1. Git 基线：已核对正确

P2-4 更新：F 已核对为 f5236b500194d129345479799d149e22d18acb52；用户授权的 A/B 本地证明分支和独立工作区保留于 `.tmp/phase2/box-proof/A`、`B`，提交分别 f20745a、9a8aeb6。仅增加 @svgframe/shape-box 本地 workspace，不新增第三方依赖、不改构建脚本。两侧各自离线 npm ci、build、check:tests 和365项测试通过；首次并行全测导致既有5秒烟测超时，串行 `npm.cmd test -- --maxWorkers=4` 后均通过，未修改超时或测试断言。主工作区也通过365项、单包27项及无扩展 final 回放。未重跑 GUI/Extension Host/VSIX；无新增服务或环境升级要求。真实提交回放与历史指标见 [P2-4 报告](P2-4_REPORT.md)。以下保留先前阶段环境记录。

P2-4 前置准备更新：dir 已提交8dc8e39，39个接入变更路径零违反项。根配置现启用 stats/dir，与代码装配相同；无扩展测试使用固定 no-optional.json，不再依赖根演示配置。生产源码、依赖、构建工具均未改；323项测试、根配置两路 raw 比较和三份 final 回放通过。F 在本轮独立准备提交后登记，不使用旧8dc8e39代替。见 [基线准备记录](P2-4_BASELINE_PREPARATION.md)。

P2-3b 更新：前置 stats 提交92cde9f，相对冻结1ff4352的实际接入差异检查通过。离线增加 @svgframe/command-dir 本地 workspace，无第三方新增，冻结 DirectoryPort/NodeDirectoryAdapter/构建工具未改。默认 A 启用 stats、dir；根配置仍为空，联合测试配置为 doc/transcript/inputs/commands.plugins.json。319项主测试、单包9项、真实目录/链接/失败继续交互、A/B 与三份无扩展 raw 基线通过。见 [P2-3b 记录](P2-3b_REPORT.md)。

P2-3a 更新：框架冻结提交为 1ff4352de83ac64943f36c9d51684101249fa1f6，补齐 final→该 SHA 的历史指标。本轮离线安装仅增加 @svgframe/command-stats 本地 workspace 链接，无新增第三方依赖/工具版本。build 自动发现新包，未改编排。默认 A 启用 stats；无扩展基线通过 SVG_CLI_ENTRY 指向 test/fixtures/entries/no-optional.mjs，以显式空配置运行冻结 bootstrap。300项主测试、单包11项、A/B 和三份 raw 基线通过。见 [P2-3a 记录](P2-3a_REPORT.md)。

P2-2c 更新：前置提交 4a4ed73，无新增依赖/锁文件变更；新增 metrics、verify:assemblies、verify:plugin-diff 脚本。Node 24.14.0 原生 ESM 解析/清单发现已实测，Windows 清单扩展路径需 native realpath。未知 workspace 的隔离构建/编译后加载、286项主测试和字节回放通过。PlantUML 1.2024.3 已实际渲染前后图；独立扩展8项单测通过，GUI/VSIX 本轮未重跑。首次指标只取 final→已提交4a4ed73，本轮冻结 SHA 随审阅提交确定。见 [P2-2c 记录](P2-2c_REPORT.md)。

| 项目 | 实测结果 |
|---|---|
| 标签名/类型 | final / annotated tag（附注标签） |
| 标签对象 SHA | `7d178c98f5038950b8ece6fcc6d204dcaf5a9879` |
| `final^{commit}` | `2054ec5667ad2e5f16b9b52ddd75a3435ed63c9d` |
| 标签说明 | 阶段一final |
| 当前 HEAD | `0ebd382699f345699032eea05688b47ecd854340` |
| final → HEAD | 仅新增 `docs/phase_cli_2.md` 和两张需求图片，运行代码/测试/锁文件相同 |
| 远端 origin | `git@github.com:sscayufei/svg_cli.git` |
| 远端 final 查询 | `git ls-remote --tags origin 'refs/tags/final*'` 成功、无结果；本次查询未发现远端标签 |

附注标签的对象 SHA 与指向的 commit SHA 不同是正常现象。指标和回放以 `final^{commit}` 取源码；不要把标签对象当源码提交。

本轮没有 fetch/push、改标签或新增提交。用户后续可单独推送 final；开发不因此阻塞。P2-6 再核对远端 final/p2 与本地一致；已有标签禁止移动。

复查命令：

```powershell
git cat-file -t refs/tags/final
git rev-parse 'final^{commit}'
git diff --name-status final HEAD
git ls-remote --tags origin 'refs/tags/final*'
```

## 2. 当前可用环境

| 项目 | 实测版本/配置 | 结论 |
|---|---|---|
| Node.js | 24.14.0，`D:\Nodejs\node.exe` | 满足现有 engines `>=24 <25`，不升级主版本 |
| npm | 11.9.0 | 使用 npm.cmd，保留根锁文件 |
| Git | 2.49.0.windows.1 | 标签与远端读取可用 |
| VSCode | 1.143.1 / x64，commit `e646868227c3e3a9e3f24277c8c7220be42c0be7` | 已安装，可作为首个扩展宿主验收目标 |
| TypeScript | 7.0.2 | 保留现有版本与严格类型检查 |
| tsx | 4.23.15 | 仅开发便利，不能替代编译后运行验收 |
| Vitest | 5.0.5 | 保留既有 Node 单元/集成测试 |
| @types/node | 24.19.2 | 与当前 CLI 环境配套 |
| saxes | 6.0.0 | CLI 继续使用；扩展复用依赖并单独处理源码范围 |
| Java | 25.0.2 | 可运行本地 PlantUML |
| PlantUML | VSCode 插件 2.18.1，附带 jar 1.2024.3 | `java -jar … -version` 成功 |
| Graphviz | PlantUML 自检识别 2.44.1 | PATH 中未找到 dot 不代表不能渲染；PlantUML 自检报告可用 |
| npm registry | `https://registry.npmjs.org/` | 获准联网后元数据查询成功，未执行安装 |
| Git 换行 | core.autocrlf=true；core.eol 未设置 | 新增黄金 fixture 要明确 LF，不能依赖机器默认 |

`npm.cmd ls --depth=0` 未报告缺失/无效的现有顶层依赖。上一轮（同一运行源码、同日）`npm.cmd run build` 与 24 文件/214 项测试通过；本轮没有因纯文档变更重复执行整套测试。P2-0 改动工程配置后必须重新构建、测试。

已读取扩展列表，包含 PlantUML/Draw.io 等；未见常见 Red Hat XML 扩展，但不能据此证明没有任何大纲提供者。正式观察与截图仍使用隔离宿主，且必须打开文本 SVG，而非图片预览。

## 3. 新增工具选型与版本核查

版本来自本轮 npm 官方 registry 的只读查询；尚未安装，也未验证它们与本项目的完整组合。P2-0 安装时采用精确版本并提交锁文件；出现真实兼容问题时记录替换理由，不无条件更新到 latest。

| 包/工具 | 选定或查询结果 | 用途与阶段 |
|---|---|---|
| @types/vscode | **选用 1.140.0**；查询确认已发布 | P2-0，扩展 API 类型 |
| @vscode/test-electron | **3.1.0**；engines Node >=22 | P2-0，程序化启动独立 Extension Host 并执行宿主测试 |
| esbuild | **0.28.2**；engines Node >=18 | P2-0，扩展 bundle，包含 saxes、排除 vscode 模块 |
| @vscode/vsce | **4.1.1**；engines Node >=22 | P2-1b 前加入，仅本地 VSIX 打包与安装验证，不发布市场 |
| @vscode/test-cli | 查询为 0.0.15；engines Node >=22 | 本阶段不必引入，使用 test-electron 程序化入口即可 |
| 复杂度分析 | 复用已固定 TypeScript AST | P2-2c，实现明确口径的指标脚本，不为此新增整套 lint 平台 |

**为什么不用最新 @types/vscode：**最新查询结果为 1.146.0，高于本机 1.143.1；精确查询 1.143.0 返回 E404，发布列表中 1.140.0 是不高于本机的最近版本。本项目所需文件装饰/符号提供 API 是既有 API，先用 1.140.0 类型并由真实宿主验证。扩展初始 `engines.vscode` 采用 `^1.143.1`，测试目标固定 1.143.1，不宣称验证了更早 VSCode。以后调整支持范围另行记录。

Node 24 满足上述工具的声明 engines，不等于它们已通过项目测试。VSCode 内置 Node 与命令行 Node 也不能混为一谈：本轮没有启动 Extension Host 读取 `process.versions`，P2-0 烟测时记录真实宿主版本；扩展打包目标先采用保守的 Node 22 / ES2022，避免使用仅 CLI Node 24 可用的能力。

官方依据：扩展宿主测试使用 [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension) 的程序化流程；bundle 遵循 [Bundling Extensions](https://code.visualstudio.com/api/working-with-extensions/bundling-extension) 中将 vscode 排除的方式；VSIX 打包参考 [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)。这些是工具用法依据，版本是否发布由上述本轮 registry 查询确认。

## 4. 工程配置准备

### P2-0：先让扩展可独立开发，不搬迁 CLI

- 根 package.json 加入实际存在的扩展 workspace，保留现有 CLI 脚本含义；后续 P2-2a 再增加 core/plugins 工作区。
- 根目录唯一 package-lock，工作区不额外生成分散锁文件；开发工具使用项目本地安装，不依赖全局 yo/tsc/vsce。
- 扩展自己的 package.json、tsconfig、bundle 入口、测试入口；CommonJS package 边界明确，避免受根 `type:module` 影响。类型检查可用 Node16 模块解析配合该包 CommonJS 类型，不使用旧 Node10 配置。
- 新增 `.vscode/launch.json` 与 tasks：F5 构建后启动扩展开发宿主、准确 outFiles/source map、独立 fixture workspace。不改用户全局 VSCode 设置。
- 扩展 manifest 明确 name/version/publisher/engines/main/activationEvents；onStartupFinished 支持未打开 SVG 时的文件标记，不能把初次激活隐含在手动测试步骤中。
- 扩展单元测试只测纯解析/装饰逻辑，依赖 vscode 的测试在 Extension Host 中执行；不让 Node Vitest 直接 require 虚拟 vscode 模块。
- 忽略 `.vscode-test/`、宿主用户数据/日志、`.tmp/`、各包 dist、VSIX；保留调试配置、测试源码、示例、正式截图与证据。
- 为新增文本 fixture 和脚本确定 LF；新增 .gitattributes 只针对需要稳定字节的路径，不顺便全仓库 renormalize。

### P2-2a～P2-2c：支持独立插件包

- core 与每个插件拥有自己的输出目录和 package exports；宿主编译产物目标为 `dist/host/main.js`。
- 构建先 core，再依赖 core 的插件，最后 host；扩展走独立目标。编排脚本发现工作区并处理依赖，不能为新增 box/tree-star 修改脚本中的列表。
- workspace package 版本、内部依赖、main/exports/types 采用一致约定；插件构建不通过宿主源码路径获取类型。
- `npm.cmd run build` 负责 CLI/core/插件；`build:extension` 负责扩展；`build:all` 汇总，避免原 build 偷偷遗漏插件。
- `npm.cmd test` 保留 Node 测试入口并涵盖插件独立测试；`test:extension` 专门启动宿主；`test:all` 汇总。具体脚本必须在引入阶段提供，不能在文档列出但实际不可执行。
- 架构测试扫描新目录和 exports 边界，识别 import/re-export/dynamic import；不能继续只扫旧 src 四层。

npm workspaces 能关联本地包，但 `npm run --workspaces` 的顺序按工作区顺序执行，不能据此假设自动进行依赖拓扑排序。构建编排需显式处理，见 [npm workspaces 文档](https://docs.npmjs.com/cli/v11/using-npm/workspaces/)。

## 5. Windows、沙箱与可重复验证

1. 使用 `npm.cmd`/`code.cmd`，路径带空格必须引用。CLI 保持 UTF-8；自动回放由 Node 传 Buffer，避免 PowerShell 管道编码转换。
2. VSCode 日志/扩展宿主用户数据使用独立测试目录，不把个人扩展配置混入验收；首次下载测试宿主需联网。已有 VSCode 可作为离线候选，但其可执行路径/版本必须明确记录。
3. 本轮 Git SSH 子进程与 VSCode 日志在沙箱中曾被拒绝，获准重跑后读取成功；npm 沙箱查询为 only-if-cached，联网查询后才确认版本。这些是环境权限边界，不是项目逻辑失败。
4. 测试启动若再遇 spawn EPERM，应按实际权限请求运行；不删除测试、不修改业务逻辑来绕过。GUI 调试、下载安装等必要动作在开发阶段按工具要求执行。
5. 符号链接创建可能受 Windows 权限限制：排序/不跟随策略必须有替身测试；真实链接测试按环境记录，普通文件与目录的真实测试不能省略。
6. dir 回放使用固定的临时 cwd；日志放在 cwd 外。两次运行之前恢复相同初始文件，顺序运行于同一逻辑路径，避免绝对路径差异被人为抹平。

PlantUML 已有可用 jar，不需要先安装另一套 Java/Graphviz。开发时通过环境变量或命令参数提供 jar 位置，不能把本机扩展安装绝对路径硬编码进仓库脚本。新图实际渲染仍待文档阶段验证。

## 6. 准备状态与下一步

| 项目 | 状态 | 归属 |
|---|---|---|
| 本地 final 校验 | 已完成，正确 | 本轮 |
| CLI 版本/依赖与源码一致性核查 | 已完成 | 本轮 |
| 新依赖元数据/版本存在性 | 已完成；组合兼容性未测 | 本轮 / P2-0 |
| 扩展脚手架、依赖安装、F5、宿主烟测 | 未开始 | P2-0 |
| 原始字节回放、final 运行基线 | 未开始；旧规范化测试继续保留 | P2-0 |
| core/plugin 包构建、动态加载 | 未开始 | P2-2 |
| PlantUML 可用性 | 已完成自检；新图未生成 | 本轮 / P2-6 |
| VSIX 打包与隔离安装 | 未开始 | P2-1b |
| final 远端同步 | 远端未查到；本轮未推送 | 用户提交/交付流程 |

本轮无需重装 Node/npm/VSCode，也无需新增服务、数据库、Docker 或其他语言运行环境。可以按开发计划开始 P2-0；其退出条件通过后再实施 VSCode 功能。
