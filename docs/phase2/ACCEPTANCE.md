# Phase 2 验收与证据清单

本清单与 [开发计划](DEVELOPMENT_PLAN.md) 配套。状态初始均为待实现/待验证；表中证据目录是目标位置，不表示已有文件。需求原文优先于示例排版和设计说明。

2026-11-17 进度：V-01 已完成本地验收，见 [P2-1a 记录](P2-1a_REPORT.md) 和 [真实截图](../../doc/evidence/phase2/p2-1a-svg-badge.png)。V-02/V-03 的 SVG 大纲仍待 P2-1b；内置 TypeScript 大纲的观察记录仅为先行学习证据。

## 1. 需求追踪

| 编号 | 需求 | 实现阶段 | 必备验证与证据 |
|---|---|---|---|
| V-01 | Explorer 的 SVG 文件显示 [] | P2-1a | 非 SVG/目录无标记；同名 .svg 目录；文件未改名/未改内容；真实截图 |
| V-02 | 原生大纲显示根/容器/叶子 | P2-1b | 嵌套、无 id、自闭合、任意元素；DocumentSymbol 层级与名称 |
| V-03 | 定位、编辑更新、不完整 XML | P2-1b | range/selectionRange、CRLF/中文/emoji、多行；编辑后更新；错误后恢复；真实点击定位 |
| V-04 | VSCode 职责、模式、复用分析 | P2-1b | 调用链、Decorator/Adapter 异同、复用表、安装步骤和 VSIX 检查 |
| F-01 | 四接口在内核，类实现 | P2-2a | 注册/调用/缺省测试；公开 API 与依赖边界扫描 |
| F-02 | 内置十九命令与六图形兼容 | P2-0、P2-2a～6 | 原 214 项回归；无可选扩展与 final raw 输出相同 |
| F-03 | 扩展点清单可核验 | P2-2c、P2-6 | 接口、职责、调用文件/函数、实现、缺省、契约错误均有真实位置 |
| A-01 | 属性默认回退与冲突规则 | P2-2b、P2-4 | 普通 fill、非法 label、零/一/多命中；失败不走默认处理 |
| A-02 | 一条 set 一个撤销单元 | P2-2b、P2-4 | 多部件一次 undo/redo；部分修改后抛错；已有 redo/blocked/来源路径不变 |
| C-01 | stats 独立包与准确统计 | P2-3a | DFS 首次类型顺序；根不计、空容器计容器；空输出；help/禁用；历史不变 |
| C-02 | dir 替身测试 | P2-3b | 混合、隐藏、空、读取失败、稳定排序、两空格、特殊项 |
| C-03 | dir 与真实适配器 | P2-2c、P2-3b | 临时目录；未 init；cwd 不随 read/save 变化；失败后继续命令 |
| C-04 | dir 无副作用与双装配 | P2-3b | 文档/dirty/双栈/blocked/路径前后相同；固定 cwd raw 输出一致 |
| S-01 | box 创建、整体操作与嵌套 | P2-4 | 派生 ID、全子树冲突、in/move/scale/delete/group/addto/front/back |
| S-02 | box 保护与读回 | P2-4 | ungroup 拒绝；必要部件 delete/addto/group 拒绝；完整恢复、损坏拒绝、未安装降级、重复 ID 拒绝 |
| S-03 | box 两属性及版本 B 会话 | P2-4 | fill/label 语义与反馈、undo/redo；讲义会话、SVG 输出 |
| T-01 | 两标签并存/互不感知 | P2-4、P2-5 | (box) 在前、星在后；根也支持装饰；无标签字节不变 |
| T-02 | dirty 状态机 | P2-5 | 新建/编辑/保存/再编辑/undo 回保存点/redo；失败保存、canvas、删除/迁移、多会话 |
| L-01 | A/B 同注册校验路径 | P2-2c | 代码方式也校验 manifest/重复/回滚；同实现、集合、顺序和 options |
| L-02 | 加载失败隔离 | P2-2c | 四类指定失败、无效配置、重复名、部分注册/订阅回滚、后续插件继续 |
| L-03 | 通用解析与构建 | P2-2c | 包名/相对目录/文件、配置基准目录、ESM、中文空格路径、禁用不求值、内部依赖失败区分 |
| G-01 | 插件接入零修改证明 | P2-3～5 | 每个接入 SHA、允许路径、core/已有插件为空、loader 独立性；box A/B 两提交 |
| Q-01 | 插件独立可测 | P2-3～5 | 每包测试入口；替身上下文；不 import 其他插件；单包测试输出 |
| Q-02 | 文档、ADR、图与指标 | P2-2c、P2-6 | doc/README、ADR 至少 3（计划 5）、前后 PlantUML、docs/metrics 脚本数据 |
| Q-03 | 过程提交与交付 | 每阶段、P2-6 | 六个需求过程节点映射、AI 检查记录、远端 final/p2、tag 不移动 |

## 2. 错误与继续运行

以下完整错误输出必须测试，包括 `error:` 前缀；内部实现可抛无前缀错误，由宿主统一格式化，避免重复前缀。

```text
error: unknown command: stats
error: unknown command: dir
error: unknown attribute: label
error: cannot ungroup composite shape: <id>
error: cannot read directory: <path>
error: plugin not found: <module>
error: plugin has no default export: <module>
error: plugin manifest mismatch: <name> (declared: …, registered: …)
error: plugin failed to activate: <name> (<reason>)
error: duplicate registration: <category>/<name>
error: invalid plugin config
```

manifest 错误中省略号是需求占位，实际测试应展开确定的类别/名称集合。冲突处理器、必要部件破坏、非法插件对象等新增错误在实现时固定字符串并记录，不冒充需求指定文案。

启动失败测试至少使用“前一插件成功 → 当前插件部分注册后失败 → 后一插件成功”的序列，证明此前注册保留、当前残留清空、后续仍运行；再执行 help/命令验证真正可用。仅检查某条 error 文本不足以证明回滚。

命令失败测试要保留一个可 undo 和一个可 redo 的场景，比较完整内容与历史状态，再实际 undo/redo 确认栈中对象仍可用，避免只比较计数。

## 3. 输出回放与 fixture 约定

目标布局：

```text
doc/transcript/
  cli-1.txt                    # Phase 1 §6：纯命令/注释
  cli-1-flowchart.txt          # Phase 1 §6.1 A
  cli-2-box.txt                # Phase 1 §6.1 B
  cli-2-commands.txt           # stats / dir
  cli-2-decorators.txt         # 两标签与 dirty
  inputs/                     # 固定输入 SVG 与目录准备描述
  expected/                   # stdout/stderr/SVG 黄金文件
doc/evidence/phase2/           # 实测截图、命令摘要、证明提交记录
docs/metrics/                 # 机器生成 JSON/CSV/Markdown 等
.tmp/phase2/                  # 不提交：隔离运行、完整日志、测试缓存
```

输入没有 `svg>`、启动输出或预期结果；预期输出不是从待测新实现盲目生成后立即当标准。旧能力预期来自 final；新能力结合需求和决策人工核验后固定。

三类比较分别做：

1. **兼容性：**final 与当前无可选插件执行旧会话。原始 stdout、stderr 分别按 Buffer 比较；不 trim、不去提示符、不改换行，不过滤错误。
2. **双装配：**A/B 使用相同插件实现/集合/顺序/options、输入文件和 cwd。配置路径可不同，但被测试目录内容相同；同一个启动方式，不能一边 npm 包装一边直接 node。
3. **语义：**新能力对需求黄金输出；生成 SVG 验证数据、顺序、转义和 data-kind；禁用插件后的降级行为另测。

当前 `cli.acceptance.test.ts` 会规范化 CRLF、去提示符及 trim。保留其语义价值，但新增原始回放层，不能用它替代第 1/2 类比较。

dir 两次运行按同一临时目录顺序执行，重置已知 fixture 后保持列表固定；stdout/stderr 日志、构建产物、save 的目标不能落在被列目录中。不能通过删除输出中的差异来制造一致。

## 4. Git 接入证明

框架冻结提交、命令插件完成提交、box 演示共同父基线 F、接入 C_A/C_B、最终源码提交都记录完整 SHA。避免 tag 混用：过程节点用普通提交，final/p2 是交付标签。

以 box 为例：

- C_A 的父提交为 F；新增 shape-box 包，已有运行代码仅允许一个顶层 composition 修改；测试/文档/依赖元数据逐项解释。
- C_B 的父提交也为 F；新增相同插件内容，仅配置及必要元数据变化，已有运行源码不能修改。
- F 先备好 stats/dir 的一致装配和测试基础；不得让 C_A/C_B 顺带补 core、loader、writer、formatter 或构建映射。
- 合并两种演示后的最终提交不是接入判据的替代品；保留两个演示提交可达并记入报告。
- 每个后续新插件也遵守既有插件差异为空；tree-star 不得改 shape-box。

执行核查前确认每个路径在相应 Git 树中存在。以下为目标布局示例，实际脚本以最终路径为准：

```powershell
git diff --name-status 'C^' C
git diff 'C^' C -- src/core src/host/loading plugins ':(exclude)plugins/shape-box'
rg -n 'import|require|switch' src/host/loading
```

示例中的 C 需要替换为真实 SHA。仅第二条空输出不够：还须审阅第一条，确认 src/host 的其他已有运行文件没有被修改；仅 rg 无结果也不能证明 loader 通用。指标、锁文件、package scripts 中不可夹带绕过限制的业务实现。

## 5. 指标的固定口径

脚本读取 Git revision 的树与 blob，输出完整 SHA、文件清单、职责映射、计数口径和工具版本。不要用当前工作区文件模拟 final；revision 无效、源码目录不存在必须失败。

三类 CLI 运行代码：

| 版本 | 内核 | 宿主/装配处 | 插件 |
|---|---|---|---|
| final | src/domain、src/application | src/cli、src/infrastructure | 无独立插件目录 |
| p2 目标 | src/core 生产源码 | src/host 生产源码 | plugins 下生产源码 |

Phase 1 的内置命令/具体形状迁移会使内核行数降低、插件行数增加，必须标明迁移效应，并同时报告 CLI 总量；不能把移动文件误当成净删减功能。VSCode 扩展另表。排除测试/fixture、声明产物、dist、依赖、脚本；辅助工具可以另表列出。

行数输出物理总行数和非空非注释代码行数，统一 CRLF/LF 的计数处理；职责由版本化的路径/模块职责映射生成。具体计数实现以 TypeScript scanner/AST 为基础，配最小样本验证注释、字符串、模板字符串与空文件，不用正则删注释破坏字符串内容。

圈复杂度采用本项目固定 AST 口径：每个有函数体的函数/方法/构造器/accessor/箭头基础值为 1；if、各类循环、非 default case、catch、条件表达式、`&&`/`||`/`??` 及对应逻辑赋值各加 1；else/default/try/可选链不额外增加；嵌套函数分别计算，不把内层分支加到外层。文件顶层控制流另列，基础为 0，按同样分支规则计数。报告称其为本项目圈复杂度口径，不假定与任意第三方工具数字相同。

首次产出在 P2-2c；最终先记录运行源码终态 SHA，再生成报告提交。p2 指向最终报告提交后重算 final/p2，确认运行源码与记录终态一致，不能在文档中引用无法对应最终 tag 的中间值。

## 6. GUI 与过程证据

VSCode 必须保留本项目真实运行截图：文件标记、大纲点击定位。编辑更新、不完整 XML 后恢复至少有操作记录/宿主测试证据，可辅以截图。记录 VSCode/扩展版本、示例路径与复现步骤，需求图片不计完成证据。

PlantUML 源码与渲染结果都进入正式报告；前图描述 final 实际架构，后图描述 p2 实际依赖，不能将计划中的目录直接当成最终架构。

AI 协作记录至少包含“建议 → 核验依据 → 采纳或修正 → 验证结果”。本轮已发现的实例可作为后续起点：final 的标签对象与提交不同、旧测试规范化输出不满足原始字节证明、@types/vscode 最新版高于本机且同次版本未发布、Node ESM 相对目录入口需要显式解析。功能开发时继续记录实际代码建议的检查。

## 7. 完成定义

每个阶段的退出条件通过且有真实证据，才标记完成。截图待补、宿主没运行、指标未从历史生成、A/B 没有对应提交等，均属于未完成，不用其他测试替代。

最终必须同时具备：两部分源码与可复现运行步骤、四扩展点与独立插件测试、全部错误/回滚/兼容/双装配验证、正式报告和 ADR、生成指标脚本及结果、过程提交和远端 p2。默认不做选做图形、市场发布或热插拔。
