# P2-3b：dir 独立命令插件与命令阶段验收

日期：2026-11-17。开始时工作区干净，HEAD 为 stats 接入提交 `92cde9f057f3b46080b8750f20555ef94c7f83dd`；框架冻结 SHA 仍为 `1ff4352de83ac64943f36c9d51684101249fa1f6`。状态：本地开发与验收通过，待审阅提交；dir 接入 SHA 尚未产生。

## 实现与 Adapter 角色

新增 workspace `plugins/command-dir`（@svgframe/command-dir），包含 DirPlugin、DirCommandDefinition、DirCommand，manifest 只声明 commands/dir。仅依赖 core public，命令是 query，不需要 SVG 会话，不直接访问 Node 或打印。

从 DirectoryPort 读取直接条目，过滤 . 和 ..、保留隐藏项；目录/文件/链接/其他依次分组，组内按大小写敏感的 JS 字符串序排列，不依赖操作系统或 locale。标签为 [DIR]/[FILE]/[LINK]/[OTHER]，后接两个空格。空目录固定一行，任何读取异常统一包含目标路径，框架输出 error 后继续交互。每次重新读取，不改输入数组、不缓存。

| Adapter 角色 | 实际位置/职责 |
|---|---|
| Client | command-dir/DirCommand.execute：只调用目录目标接口，负责排序和用户输出 |
| Target | core/application/ports/DirectoryPort：startup path 与只读 read() |
| Adapter | host/filesystem/NodeDirectoryAdapter：读取直接 Dirent、区分四种条目、包装失败、返回冻结值 |
| Adaptee | Node fs.readdirSync({withFileTypes:true}) / Dirent |
| 装配 | composition 提供同一个 context.directory；A/B 均经冻结 installer 把它注入命令定义 |

端口/Adapter 已在 P2-2c 冻结，本阶段未修改它们。链接不跟随，目录不递归，SVG read/save 不改变 startup path 或 cwd。OTHER 用替身验证；本机真实特殊项验证使用目录链接，不声称在 Windows 创建了 FIFO 等其他项。

## 接入边界

默认 A 按 stats、dir 顺序启用；B 的 [commands.plugins.json](../../doc/transcript/inputs/commands.plugins.json) 加载同一集合/顺序/类/options。两命令可分别启用或禁用，均提供自身参数/help；根 plugins.config.json 仍为空，保持后续 box 前独立准备统一演示基线的计划。

已有运行源码仅修改 src/host/composition.ts；root package/lock 只补本地 dir workspace 依赖/链接，无第三方新增。core、host/loader/filesystem/cli/svg/bootstrap/main、构建脚本、既有内置包和 stats 包均相对 92cde9f 无差异，见 [边界摘要](../../doc/evidence/phase2/p2-3b-boundary.json)。文档变更限定 doc/docs/新插件 README，不改根 README 或扩大冻结差异工具白名单。

旧 stats 集成测试的 A 显式指定 stats-only 列表，原断言/预期保留；其回放新增测试 wrapper 调用冻结 bootstrap，使 A/B 始终同集合，不随默认列表加入 dir 而漂移。没有修改 stats 实现或单包测试。

stats 实际提交核验也已补齐：`verify:plugin-diff -- 1ff4352 92cde9f --plugin plugins/command-stats --mode code` 通过，唯一父基线、37个变更路径和依赖字段符合规则，见 [已提交差异证据](../../doc/evidence/phase2/p2-3a-committed-diff.json)。

## 实际验证

| 命令/验证 | 结果 |
|---|---|
| npm.cmd install --offline --ignore-scripts --no-audit --no-fund | 一个本地 workspace 链接，无网络下载/新增第三方依赖 |
| npm.cmd run build | 冻结编排自动发现/构建新包及宿主，无脚本修改 |
| npm.cmd run check:tests | 全部主测试源码严格类型检查通过 |
| npm.cmd test | 38 文件 / 319 项通过，比 P2-3a 增加19项 |
| npm.cmd test --workspace @svgframe/command-dir | 单包9项通过，只 import core public 与包内源码 |
| commands plan A/B | 同一直接 node 入口、同插件集合/顺序/options 和同一生成 cwd；两路 raw stdout/stderr 相同，列目录内 fixture 内容相同 |
| stats-only plan | 原 stats 语义/错误/输出字节回放仍通过，A/B 保持仅 stats 的同集合 |
| verify:baseline（SVG_CLI_ENTRY=no-optional wrapper） | 显式独立空配置，三份 final stdout/stderr/生成文件逐字节一致 |

独立测试覆盖参数（含引号）、空目录、混合分组、字符串排序、隐藏/中文项、点条目、链接/其他、两空格、只读输入、重复执行和失败恢复。真实集成覆盖 Node Adapter 的空目录/隐藏项/目录链接/不递归、A/B 同服务与命令类、未 init 即可用、失败后继续 init/stats/help，以及 stats/dir 各自启禁用的四种组合。

无副作用验证在真实目录成功/失败两条路径中，比较完整场景、ID/父归属、来源路径、独立保存点观察者、通知数量、两栈及 blocked；再实际 redo/undo 确认记录仍有效。成功 save 后也验证 dir 不解除屏障，read/save 不改变目录或进程 cwd。该观察者是测试替身，正式 modified-star 仍待 P2-5。

联合会话为 [cli-2-commands](../../doc/transcript/cli-2-commands.txt)，预期按规则手工计算。六次列表在 init、undo/redo、save/read、canvas 前后均一致；seed 包含子目录、隐藏项和输入 SVG。日志、产物和 `../dir-session.svg` 都在被列 cwd 外，不能污染列表。A/B 工具的文件对比范围为列目录内 fixture，未将外部同名保存文件当作两次独立 SVG 归档证据。

正式证据：[验证摘要](../../doc/evidence/phase2/p2-3b-checks.json)、[A/B 摘要](../../doc/evidence/phase2/p2-3b-assemblies.json)、[无扩展基线](../../doc/evidence/phase2/p2-3b-baseline.json)。raw 目录分别为 `.tmp/phase2/assemblies-hY9fiL` 与 `.tmp/phase2/baseline-KBwbEd`。没有重跑未修改的 VSCode 单测/GUI/Extension Host/VSIX，未生成新指标冒充未提交代码。

## 需求映射与后续

C-02/C-03/C-04、Q-01 的 dir 与联合命令验收就绪，C-01 的 stats 继续回归通过；**命令插件完成过程节点本地验收通过**。F-02 无扩展兼容不变。G-01 已有 stats 实际接入证据；dir 当前仅工作区边界，提交后补接入 SHA 和正式提交差异检查。

检查中的取舍落实：排序由命令承担而非修改 Adapter；链接独立分组且不跟随；复制排序而非原地改只读结果；错误以端口 path 输出；所有 IO 查询保持 query，不借用文档命令屏障。没有发现需要修改冻结核心/Adapter 的缺口。

建议提交：`feat(plugin-dir): list working directory through filesystem adapter`。本轮未对项目 git add/commit/push/tag。提交后运行：

```powershell
npm.cmd run verify:plugin-diff -- 92cde9f057f3b46080b8750f20555ef94c7f83dd <dir-commit> --plugin plugins/command-dir --mode code
```

下一步按计划在 P2-4 前独立准备 stats/dir 一致的代码/配置集合与演示基线 F，登记实际 SHA，再开展 box 的 A/B 独立接入证明。本轮没有修改根演示配置或提前实现 box/star。
