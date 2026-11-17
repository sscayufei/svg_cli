# P2-6：综合验收与交付候选

日期：2026-11-17。开始时工作区干净，HEAD为 `360fac0c68711a954d27213989fb735eeaec5adc`，即用户提交的P2-5标签完成节点。状态：本地综合验收完成，收尾报告已准备，最终Git发布按 [RELEASE.md](RELEASE.md) 在用户审阅后执行；在远端核验前不标记全阶段完成。

审阅决定：用户选择“仅创建本地收尾提交”。本轮仅提交报告/指标/证据/验收工具，并在该提交上重核生产源码与历史指标；不创建p2、不执行远端推送。此报告所属普通提交即本地收尾节点，实际SHA通过Git读取，避免写回自身造成自引用。发布和远端核验保留为后续待办。

## 本轮完成

1. 从真实提交Git archive到全新目录 `.tmp/phase2/p2-6-9_frztat/source`，不复用原node_modules/dist；按锁文件离线npm ci安装201个包，build:all严格构建所有CLI包/host及扩展。
2. check:tests、43文件/399项主测试、8项扩展单测通过；stats/dir/box/star各自独立入口分别11/9/27/22项通过。
3. 固定VSCode1.143.1二进制缓存复用，扩展重新构建/打包。开发版和仓库外临时目录独立VSIX安装版均通过真实标记、大纲层级/点击/编辑/异常恢复。构建、打包、安装bundle字节相同；本轮5张新宿主截图已核对。
4. 三份无可选插件final会话与干净CLI原始字节一致；五份原有stats/commands/root/box/star A/B plan重跑通过。新增最终全集合工具，六份真实四插件A/B会话原始两流和全部生成物一致，双标签手工预期另层校验。
5. 原star回放在dir之后保存到cwd，初始列表虽稳定，最终验收仍改用目录外目标以严格满足约定。新增cli-2-star-release.txt和verify-phase2-release.mjs，同时捕获目录内/外文件；未改原会话/预期/生产实现。
6. 重新核验stats/dir/box两真实接入；补tree-star实际360fac0提交差异：40路径，core/loader/全部既有插件/原脚本不变，composition仅追加import和条目，根配置仅追加star，根manifest仅加依赖。没有把单模式差异工具的越界当作通过。
7. 生成真实Git指标：1d1b646→360fac0的star增量，final→360fac0的源码终态。记录运行文件/包元数据指纹并新增只读交付核对工具，可在最终p2上重新计算并验证远端refs。
8. 完成正式 [Phase2报告](../../doc/PHASE2_REPORT.md)、最终实际PlantUML及渲染、扩展点/ADR落点、安装/装配说明、需求映射、AI建议核验和发布顺序。Chrome真实渲染本轮box SVG并保存新截图。

## 实际结果与定位

| 检查 | 证据 |
|---|---|
| 干净安装/全构建/399主测试/8扩展单测/四独立包 | [clean-checks](../../doc/evidence/phase2/p2-6-clean-checks.json)，19份原始运行日志保留在本地run目录 |
| 开发版/安装版真实宿主 | [开发版](../../doc/evidence/phase2/p2-6-development-host.json)、[安装版](../../doc/evidence/phase2/p2-6-installed-host.json)、[安装版大纲](../../doc/evidence/phase2/p2-6-installed-outline-checks.json) |
| VSIX归档/哈希/bundle一致 | [vsix](../../doc/evidence/phase2/p2-6-vsix.json)，本地包 `.tmp/phase2/p2-6-svg-cli-companion-0.2.0.vsix` |
| final兼容原始字节 | [baseline](../../doc/evidence/phase2/p2-6-baseline.json)，raw `.tmp/phase2/baseline-Zg1dwi`，显式指向干净CLI |
| 六份四插件全集合回放 | [release-assemblies](../../doc/evidence/phase2/p2-6-release-assemblies.json)，raw `.tmp/phase2/release-rJTkzS` |
| stats/dir/box/star旧plan回归 | evidence目录p2-6-assemblies-{stats,commands,commands-root-config,box,star}.json |
| 实际接入差异 | [stats](../../doc/evidence/phase2/p2-6-stats-diff.json)、[dir](../../doc/evidence/phase2/p2-6-dir-diff.json)、[box A](../../doc/evidence/phase2/p2-6-box-code-diff.json)、[box B](../../doc/evidence/phase2/p2-6-box-config-diff.json)、[star](../../doc/evidence/phase2/p2-5-committed-diff.json) |
| 源码指纹/候选指标重算 | [runtime-source](../../doc/evidence/phase2/p2-6-runtime-source.json)，预检查raw `.tmp/phase2/delivery-jcsopy` |
| 真实图/预览 | [最终依赖图](../../doc/architecture/phase2.svg)、[box截图](../../doc/evidence/phase2/p2-6-box-preview.png)，均已实际查看 |
| 远端只读起点 | [remote-before](../../doc/evidence/phase2/p2-6-remote-before.json)，master=8dc8e39，未发现final/p2或证明分支 |

环境：Windows/PowerShell，Node24.14.0、npm11.9.0、TS7.0.2、Vitest5.0.5；真实宿主Node24.21.0/Electron43.7.7。未新增第三方依赖，未改任何生产源码/包配置/既有插件。新增两份脚本是验收工具，不参与生产指标或插件接入提交。

首次archive目录直接运行verify:baseline因Git相对树前缀失败，完整失败记录保留；未改冻结工具，从实际Git根调用并指定干净入口后通过。部分Windows沙箱子进程/目录创建需工具运行授权，按权限重跑，无产品绕过。宿主自带账户服务提示不影响测试退出码及图形结果。

## 指标、过程节点与完成条件

[phase2-source.md](../metrics/phase2-source.md)/JSON记录final→360fac0：core1340→1321、host596→804、插件0→968代码行；CLI1936→3093，函数复杂度683→1158；VSCode另列143代码行/49函数复杂度。物理行/文件职责/逐函数数据在生成JSON中，未手填数字。内置实现迁移会重新分配分类，不能解释为复杂度净降低。star接入core增量0、host加2行、插件加59代码行，见 [增量指标](../metrics/tree-star-integration.md)。

需求五个功能过程节点已有真实提交；收尾是新增报告/图/证据/验收脚本的普通提交，p2只在最终审阅后创建。建议提交：`docs(phase2): finalize verification report and reproducible metrics`。报告提交必须保持生产目录/包/构建配置与360fac0相同；交付工具在p2上重算final指标并核对源文件明细，证明报告SHA变化没有改变运行终态。

本轮本地验收要求齐备；Q-03远端交付在确认后执行：普通收尾提交、fast-forward推送master、保留两个box证明分支远端可达、推送已存在且不移动的final标签、创建并推送最终附注p2，再运行只读远端/源码/指标核对。当前记录不声称这些发布写操作已经完成。完整可审阅顺序和约束见 [RELEASE.md](RELEASE.md)。
