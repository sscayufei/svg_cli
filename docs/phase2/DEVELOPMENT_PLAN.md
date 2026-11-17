# Phase 2 分阶段开发计划

版本：1.0，2026-11-16。设计依据：[已采纳决策](DESIGN_DECISIONS.md)。环境依据：[环境核查](ENVIRONMENT.md)。验收依据：[验收清单](ACCEPTANCE.md)。P2-0 已完成本地实现和验证，待审阅提交；其余阶段未开始。实际结果见 [P2-0 记录](P2-0_REPORT.md)。

## 1. 阶段总览与依赖

| 阶段 | 目标 | 前置 | 工作量判断 | 状态 |
|---|---|---|---|---|
| P2-0 | 环境准备、扩展工程和兼容基线工具 | 本目录 | 中 | 本地验收通过，待提交 |
| P2-1a | VSCode 文件标记与原生大纲观察 | P2-0 | 小～中 | 待开始 |
| P2-1b | 原生大纲、源码定位、更新、证据和复用报告 | P2-1a | 中 | 待开始 |
| P2-2a | 包边界、四扩展点、内置实现注册化 | P2-1b | 大 | 待开始 |
| P2-2b | 属性事务、复合容器、SVG 协议、生命周期 | P2-2a | 大 | 待开始 |
| P2-2c | 双装配、加载器、目录适配器、指标与框架冻结 | P2-2b | 大 | 待开始 |
| P2-3a | stats 独立命令插件 | P2-2c | 小 | 待开始 |
| P2-3b | dir 独立命令插件与 A/B 命令回放 | P2-3a | 中 | 待开始 |
| P2-4 | box + 属性 + 类型标签，A/B 接入证明 | P2-3b | 大 | 待开始 |
| P2-5 | modified-star 与双标签状态机 | P2-4 | 中 | 待开始 |
| P2-6 | 全量回放、报告、指标、远端与 p2 交付 | P2-5 | 中 | 待开始 |

“大/中/小”用于控制单次任务范围，不是工期承诺。框架阶段可以包含多个小提交，但必须完成本阶段退出条件后才进入下一阶段。按需求先完成 VSCode 实践，再进行 CLI 架构重构；可提前阅读框架代码，不提前接入业务插件。

## 2. 每阶段共同约束

- 本阶段开始先核对 Git 状态、前置提交、相关文档和源码；保留用户已有修改。不得把计划中的目标文件说成已存在。
- 保留 Phase 1 语义；一类一文件、字段封装、依赖向内。接口签名可在既定行为下细化，新的用户可见取舍需记录依据。
- 先完成当前阶段的代码与可执行验证，再报告结果；未执行的 GUI/远端/安装验证明确标注，不能以单测通过替代。
- 现有测试只迁移必要导入路径，不删用例或改期望掩盖回归。针对实际风险增加测试，不堆砌重复实现的断言。
- 每阶段维护需求/测试映射、AI 建议检查记录和决策落点；正式报告逐步更新，避免最后集中补写。
- 每个退出节点形成普通 commit。默认由用户审阅和提交，除非明确授权，不自行 commit/push/tag；阶段执行授权不等于 Git 发布授权。
- 只有收尾最终提交使用新标签 p2；已有 final 不移动，中间节点不额外打 tag。

### 计划中的脚本命名

以下是需要在对应阶段实现的目标入口，**不是当前已经存在的 npm scripts**。

| 入口 | 引入阶段 | 责任 |
|---|---|---|
| `build:extension`、`test:extension:unit`、`test:extension` | P2-0 | 类型检查/bundle；纯逻辑测试；真实宿主测试 |
| `verify:baseline` | P2-0 | 指定 final 源码与当前 CLI 的原始字节回放对比 |
| `package:extension` | P2-1b | 生成本地 VSIX 并检查产物内容 |
| `build`、`build:all`、`test`、`test:all` | P2-2a 完成调整 | CLI/core/插件；加扩展的总入口；保持旧命令入口可用 |
| `metrics` | P2-2c | 从两个 Git revision 生成分类行数/复杂度/文件职责清单 |
| `verify:assemblies` | P2-2c 建框架，后续增加会话 | 同集合/顺序/options 的 A/B 原始输出比较 |
| `verify:plugin-diff` | P2-2c | 校验接入提交允许路径与真实路径存在性 |

脚本接受必要路径/revision 参数，不硬编码机器绝对路径或具体可选插件名；正式命令语法随实现填入 README 和 ACCEPTANCE。

## 3. P2-0：环境与兼容性基线准备

**目标：**后续工作具备可运行的扩展开发环境与不可混淆的 Phase 1 回归基线。

工作：

1. 复查本地 final 指向；记录源码 SHA 和当前脏文件。远端尚无 final 不阻塞，列入跟踪。
2. 按 ENVIRONMENT 的精确版本加入扩展 workspace/依赖，根锁文件统一管理。建立最小 activate/dispose 烟测，不实现文件标记/大纲功能。
3. 配置 F5、类型检查、bundle、独立宿主测试入口；固定 VSCode 1.143.1，记录 Extension Host 的 Node/Electron 版本。
4. 建立独立 fixture workspace、测试数据/日志目录及忽略规则；不使用用户真实工作目录作为可改写 fixture。
5. 建立 final 基线运行工具：在隔离目录取得 final 运行源码/锁文件，构建并输入确定会话，记录原始 stdout/stderr 与生成 SVG；不切换或重置当前工作区。所需历史导出路径由工具验证。
6. 从现有 fixtures 提取纯命令会话到 `doc/transcript/`，准备 §6、§6.1 A、无扩展 help/tree 与常见错误会话。输出/输入 SVG 分开，不把提示符混入输入。
7. 比较 Buffer，不使用现有测试中的 normalize。针对新 fixture 的换行、编码与提示符输入方式固定约定；新增 `.gitattributes` 时避免重写全部旧文件。

主要变更：根 package/lock、扩展最小工程、`.vscode/`、脚本、fixture 和文档；**不改 CLI 业务实现，不迁移目录，不接入任何可选插件**。

退出条件：

- 现有 CLI 构建和 214 项回归仍通过；扩展类型检查与真实宿主激活/释放烟测通过。
- 当前 CLI 对 final 的无扩展回放原始 stdout/stderr 逐字节一致；能保存日志与基线 SHA。
- 全新构建产物可运行，测试数据不污染仓库；F5 的运行方式有可复现说明。
- 将可用/未验证的能力如实记入 ENVIRONMENT；不把元数据查询当成安装测试。

建议提交：`chore(phase2): prepare extension environment and final compatibility harness`。

## 4. P2-1a：文件标记与大纲行为观察

**目标：**在 VSCode Explorer 的 SVG 文件旁展示 `[]`。

工作：先记录原生 Outline 的展开、按位置排序、点击定位、编辑后的表现；再以类实现 FileDecorationProvider，注册并正确释放。使用文件类型信息排除 `.svg` 同名目录，不修改文件名/内容，不向祖先传播。处理新增/重命名/删除的刷新与读取失败，不向宿主冒出未处理异常。

主要变更：扩展包、专属 fixture/test、`doc/evidence/phase2/` 和文档；CLI 不变。

验证：尚未打开任何 SVG 文本时，启动后 SVG 即获标记，txt/目录无标记；目录名以 .svg 结尾也无标记；文件内容/名称前后相同；真实宿主可见效果与单元测试一致。

退出条件：文件标记截图、操作记录、原生 Outline 观察记录齐备；扩展相关测试通过，最小 CLI 回归无变化。

建议提交：`feat(vscode): decorate SVG files in Explorer`。

## 5. P2-1b：大纲、源码定位与第一部分交付

**目标：**使用原生 Outline 展示根/容器/叶子，并支持定位、更新和不完整 XML。

工作：

1. 独立 XML 结构解析器输出标签、原始 id、孩子、完整范围和起始标签选择范围；不施加 CLI 六类型、几何、画布尺寸校验，不补 ID。
2. DocumentSymbolProvider 将语法树适配为符号；读取当前文档文本，处理取消/版本变化；XML 不完整返回空，恢复后可再次生成。
3. 处理命名空间、自闭合、文本/CDATA、注释及行列映射。测试 CRLF、中文/emoji、多行属性和同一行多个元素。
4. 打包本地 VSIX，在隔离环境安装/启动验证。bundle 的 saxes 等依赖完整，不能依赖根 node_modules 的偶然存在；不发布 Marketplace。
5. 完成 A.3：宿主/插件调用链、Decorator/Adapter 对应与差异、Phase 1 解析/模型/遍历复用评估。

退出条件：嵌套/无 id/更新/异常恢复宿主测试通过；大纲点击定位、文件标记及异常恢复的真实证据齐全；安装/启动步骤可复现；正式报告纳入第一部分。**VSCode 实践过程节点完成。**

建议提交：`feat(vscode): add SVG outline navigation and extension evidence`。

## 6. P2-2a：包边界与注册式内核

**目标：**四扩展点位于 core 侧，旧命令/六图形从默认注册装配获得。

工作：

1. 按 DESIGN_DECISIONS 迁移 core/host/plugins；建立 @svgframe/core public 出口和每个内置包的独立 manifest；工作区依赖无环。
2. 定义四类接口/上下文、注册描述及稳定名称；实现注册表、缺省路径和错误协议。后续事务/加载器需要的接口在这里提出，在 P2-2b/c 完成实现。
3. CommandDispatcher 只做分词和注册表分发；内置命令包提供参数校验与帮助。ShapeFactory 只消费 provider，六个 provider 负责参数/创建/恢复/help。
4. CreateCommand 等通过公开服务工作，不在内部 new 固定工厂。history 使用公开可逆协议。
5. 增加通用 lines/操作反馈协议；树行数据支持根、semanticType、显示标签、isContainer 和装饰调用。保留无插件的字节输出。
6. 完成工作区基础构建/测试入口迁移、跨包类型导出与初版架构测试。将新增包输出纳入干净构建。

主要变更：允许改 core/host/内置包和工程配置；这个阶段就是重构阶段，尚不宣称新增业务插件的零修改证明。

验证：全部旧测试迁移后通过；无扩展回放与 final 一致；四扩展点以测试类/替身验证注册、调用、缺省。测试替身留在测试目录，不冒充正式 stats/box 插件。

退出条件：core 不导入任何具体插件，插件不导入 host/internal；编译后 Node 能启动并执行全部旧能力；help 和树基线不变。

建议提交：`refactor(core): introduce extension contracts and register built-in features`。

## 7. P2-2b：事务、复合容器与文档生命周期

**目标：**在具体 box/星号标签接入之前准备它们所需的全部通用领域能力。

工作：

1. 实现属性 handler 纯匹配、冲突拒绝、默认回退；受控事务收集修改和反馈，成功才提交历史。
2. 补齐 execute/undo/redo 的失败原子性：处理器中途失败、结果生成失败、不变量验证失败均恢复原状态，不能意外清除已有 redo。
3. 提供离线子树构建、通用容器能力、结构策略及完整性验证；创建前全子树检查，移除/迁移/分组都调用保护策略。
4. 分开领域类型/树标题/XML 描述；读取按完整候选树恢复，支持通用 data-kind 路由与无 provider 降级；已有严格 SVG 语义保持。
5. 提供只读场景状态与 init/read/save/编辑/undo/redo 成功通知；订阅可释放，观察者异常隔离。
6. 使用假复合容器、假 handler、假标签完成协议测试；不导入真实 box/tree-star。
7. 完成 ADR 001/002/003 草案到实际接口落点，标明业务插件证据待后续补充。

退出条件：失败回滚覆盖文档/索引/归属/来源路径/双栈；复合部件保护无命令绕过路径；零扩展兼容回放与全部回归通过。框架中没有 box 专用分支或派生 ID 知识。

建议提交：`refactor(core): add transactional attributes and composite invariants`。

## 8. P2-2c：加载器、双装配及框架冻结

**目标：**完成可通用安装插件的宿主，冻结具体插件所需接口，产出首次 metrics。

工作：

1. 实现 PluginInstaller 的暂存注册/manifest 校验/重复名/订阅释放事务；A/B 都调用它。
2. 实现配置结构校验和通用模块解析；相对目录、包名、编译后 JS 入口可用；区分顶层模块缺失与内部依赖/求值失败。
3. 建立稳定 main/composition、默认内置清单和 `--config`；空配置可完整运行旧能力，失败继续启动。
4. **提前实现 DirectoryPort 与 NodeDirectoryAdapter**，注入扩展上下文；补替身与真实目录的基础适配器测试，dir 命令留到 P2-3b。
5. 完成无具体插件映射的构建编排，新增 workspace 包后不改 loader、编排脚本和既有源码即可构建/加载；保留 ESM 运行验证。
6. 建立 A/B 回放及接入提交差异核查工具，先用 fixture 插件验证；固定输出流、运行 cwd、options 与排序。
7. 从 git 历史生成首次 metrics，给出分类和复杂度算法/工具版本；若输出需在提交后生成，先提交实现再以普通提交补报告，记录实际 SHA。
8. 扩充架构检查扫描新目录；写全扩展点清单、ADR 004/005、配置/错误说明及前后依赖图。

退出条件（必须全部满足）：

- 指定四类加载失败、无效配置、重复注册、部分注册失败、manifest 不匹配、订阅清理与继续加载均通过测试。
- 无扩展 final 回放一致；A/B 使用同一个 fixture 插件且输出逐字节一致；编译后入口可独立运行。
- DirectoryPort/适配器、通用输出、子树构建、结构策略、属性事务、XML 描述、树装饰与生命周期均已可被测试替身使用。
- 首次 metrics、公开 API/调用点清单与架构约束有实际产物。**框架可扩展过程节点完成。**

建议提交：`feat(host): load plugins transactionally and freeze extension framework`。

该节点后新增业务插件原则上不改 core、host/loader、渲染器或既有插件。若发现漏项，先单独提交框架修正、更新冻结 SHA，再做干净的接入提交，不将修正藏进插件提交。

## 9. P2-3a：stats 独立插件

工作：创建 command-stats 包及类实现，注册参数/help；DFS 统计叶子与容器，类型按首次出现顺序；未初始化沿用 no document；零参数；query。

变更边界：新增包、一个顶层 composition 文件、必要 package/lock/测试/文档。不得修改核心、加载器、渲染器和内置命令表。配置方式通过测试配置加载同一个包。

验证：空文档、空 g、嵌套容器、不同叶子类型首次出现顺序、根排除、容器内叶子、禁用/help、成功和失败不改变历史。独立测试不导入 box，用公开容器替身。

退出条件：独立包测试、A/B 调用、旧基线回归通过；保留本次接入 SHA 和差异说明。

建议提交：`feat(plugin-stats): add ordered scene statistics`。

## 10. P2-3b：dir 独立插件

工作：command-dir 只依赖 DirectoryPort，复用冻结适配器；稳定分组排序、双空格、隐藏/特殊项、空目录与指定错误；未 init 可用；读取失败后继续处理输入。

变更边界与 P2-3a 一致，禁止因为 dir 才新增/修改 core 端口或 host 适配器。A/B 使用同一命令类和目录接口实例构造规则。

验证：替身覆盖混合、空、隐藏、失败、稳定排序；真实临时目录组合测试；有/无 SVG、save/read 后 cwd 不变；执行前后文档/dirty/双栈/blocked 状态一致。A/B 在同一固定目录顺序执行并逐字节比较，日志在目录外。

退出条件：stats/dir 可分别禁用；新增命令会话保存并通过 A/B；**命令插件完成过程节点完成**。

建议提交：`feat(plugin-dir): list working directory through filesystem adapter`。

进入 P2-4 前，单独准备一致的代码/配置插件集合（stats、dir）与演示基线 F，根 plugins.config.json 可在该准备提交中同步，不把演示准备伪装成 box 接入。

## 11. P2-4：box、属性与类型标签双装配接入

**目标：**增加一个插件包，就能创建/恢复/编辑复合 box，并以 Git 证明两种接入方式。

工作：

1. 在冻结基线 F 上实现 shape-box 包：BoxShapeProvider、公开复合类型实现、BoxFill/BoxLabel 处理器、BoxTypeDecorator；由 package.json 声明全部贡献。
2. 创建完整派生 ID 子树；固定模板；fill 转内部 rect，label 改内部 text；操作反馈覆盖成功/undo/redo。
3. 支持 in、嵌套、move/scale/delete/group/addto/front/back 的既定容器语义；拒绝解散/必要部件破坏；读写往返、损坏拒绝、无插件降级。
4. 独立测试只使用 core public 和构建服务替身；实际内置形状组合由 host 集成测试覆盖。
5. 同一实现从 F 分别做 A、B 演示：A 只改一个 composition，B 只改配置；必要 package/lock、测试、文档逐项解释。分别记录 C_A/C_B，不能以最终合并提交代替接入证明。
6. 按 ACCEPTANCE 的规则核验差异、同会话 A/B 输出、Phase 1 §6.1 B 与生成 SVG；随后整合两种入口和配置到交付分支，保留可访问的证明历史。

测试重点：全子树 ID 冲突不残留；两个属性各一个 undo 单元；多命中冲突；处理器部分修改失败；部件直接 delete/addto/group 拒绝；空/嵌套/带附加孩子的 box；重复 ID 不因降级被忽略；未安装和安装但损坏两条读回路径。

退出条件：A/B 两份真实接入提交差异达标，core/loader/既有插件变化为零；相同实现回放一致；box 类型标签已交付；正式 ADR 补实际调用点。**box 接入过程节点完成。**

建议接入提交：A `feat(plugin-box): add box via code composition`；B `feat(plugin-box): add box via configuration`。分支/提交由用户按当时授权建立；不要为完成代码而自行重写历史。

## 12. P2-5：modified-star 与标签并存

工作：新增 tree-star 包，实例封装基线/缓存；订阅冻结生命周期服务，按内容差异标节点/祖先/根；注册在 box-type-label 后；不依赖 box 包。

变更边界：只增加新包与装配/配置及必要元数据/测试/文档；不修改 core/渲染器或已有 box。若 box 类型标签此前遗漏，不能在本提交补入已有包后仍声称零修改。

验证：新建、编辑同值、保存、再编辑、undo 回保存点、redo、分叉、失败保存、read/init、更改画布、删除/移出/调序、多会话隔离；query/dir 成功失败均不产生星；双标签顺序稳定；无标签 tree 与 final 一致。

退出条件：独立状态机测试、双标签集成与 A/B 回放通过；新标签接入差异达标；**标签完成过程节点完成**。

建议提交：`feat(plugin-tree-star): mark content changes since save`。

## 13. P2-6：综合验收与最终交付

工作：

1. 在干净依赖/构建环境完成 CLI/core/全部插件/扩展的构建、测试、宿主测试、VSIX 安装验证；明确使用的版本与命令。
2. 运行全部 final 兼容会话、box B 会话、stats/dir 与标签会话；A/B raw stdout/stderr 比较；复核生成 SVG 内容与真实截图。
3. 检查所有扩展点实现/禁用/冲突/失败路径，formal report 清单对应真实代码函数，而非设计占位路径。
4. 完成 `doc/README.md`、正式 ADR、前后 PlantUML 渲染、安装/启动/配置、目录 Adapter 角色、AI 建议核验记录。
5. 运行历史指标脚本生成 `docs/metrics/`：文件清单/职责、三类行数、复杂度增量；排除依赖/产物、扩展另列。
6. 核验 C_A/C_B 和其他插件的差异证据、实际路径存在性与日志；说明依赖元数据变化，保留证明提交在远端可达。
7. 用户最终审阅后，完成源码终态/指标报告提交与 p2 标签；确认报告提交未改运行源码，最终 `final`/`p2` 重算结果一致。最后核对远端 final/p2，不移动既有标签。

退出条件：ACCEPTANCE 中每项有真实证据或明确未完成项；无未解决的必做项才算收尾完成。不能以“已写计划”“有示例图”替代功能交付。

建议提交：`docs(phase2): finalize verification report and reproducible metrics`；p2 仅用于最终完成提交。

## 14. 阶段记录模板

在正式报告或阶段记录中使用以下字段，执行后填写真实结果：

```text
阶段：P2-…
开始时 HEAD / 前置提交：
目标与本次实现：
变更文件 / 是否触及冻结边界：
执行命令及结果（含未执行原因）：
测试 / 原始回放 / 截图 / 指标证据位置：
设计偏差与原因：
AI 建议中经检查修正的事项：
建议提交说明 / 实际提交 SHA：
遗留事项与是否满足退出条件：
```

若只完成某阶段的一部分，保持该阶段进行中，列明剩余工作；下一次从该阶段继续，不重新编号或跳过退出条件。
