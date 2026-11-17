# Phase 2 最终审阅与发布

本文件是可执行交付顺序，发布前由用户审阅。本地综合验收见 [P2-6_REPORT.md](P2-6_REPORT.md) 和 [正式报告](../../doc/PHASE2_REPORT.md)；本文不以计划命令代替已完成的远端操作。执行状态以实际Git refs及核对工具输出为准。

本轮审阅决定：用户授权“仅创建本地收尾提交”。本轮只执行普通本地报告提交及提交后的源码/指标核对，不创建p2、不推送master/证明分支/任何标签。下文标签与远端步骤保留为后续明确授权后的操作清单；P2-6整体远端交付仍未完成。

## 已固定的审阅基线

- 运行源码终态：`360fac0c68711a954d27213989fb735eeaec5adc`。干净安装/全构建/399主测试/8扩展单测、四独立包、两个真实宿主和全部回放均已通过。
- 本轮仅新增/更新文档、历史指标、真实截图/图、证据及两个验收工具。不得把新增生产变更混入报告提交；有源码变化则重新验收。
- 本地 `final` 附注标签对象 `7d178c98f5038950b8ece6fcc6d204dcaf5a9879`，指向 `2054ec5667ad2e5f16b9b52ddd75a3435ed63c9d`，必须保持不动。
- box证明分支 `phase2/box-a-f5236b5` → `f20745a82f12765a95b415b12893f8605cb52a4d`，`phase2/box-b-f5236b5` → `9a8aeb65f21f14abd807c4e1c2f27dad40d0519a`；两者唯一父提交F=f5236b5，保持可达。
- 发布前只读远端记录见 [remote-before](../../doc/evidence/phase2/p2-6-remote-before.json)：origin/master为8dc8e39，当时未发现final/p2或证明分支；发布前重新核对，禁止覆盖已有不同引用。

## 本地复核

```powershell
git status --short
git diff --check
node scripts/verify-phase2-delivery.mjs --revision HEAD --metrics
node scripts/verify-phase2-release.mjs
```

交付工具只读取Git/工作区并生成临时指标，不能创建提交、标签或push。它确认生产目录/包/构建配置与360fac0一致、final不动，并逐文件/分类比较重算指标。完整回放工具要求已构建，可通过`--source <干净构建目录>`指定本轮隔离产物。历史源文件职责/物理行/代码行/逐函数数据保存在 [metrics](../metrics/README.md)。

## 审阅后普通提交

确认当前差异只含审阅过的报告、证据、图和验收工具，再暂存明确路径并检查暂存差异；不包含.tmp、node_modules、dist、VSIX或个人配置。

```powershell
# 明确路径：README.md、doc/、docs/metrics/、docs/phase2/、
# scripts/verify-phase2-release.mjs、scripts/verify-phase2-delivery.mjs
git diff --cached --stat
git diff --cached --check
git commit -m "docs(phase2): finalize verification report and reproducible metrics"
node scripts/verify-phase2-delivery.mjs --revision HEAD --metrics
```

这是最终报告提交，运行源码仍应等同360fac0。报告中的指标引用源码终态；报告提交SHA无需写回自身。p2创建后工具用真实p2重新生成指标并与终态的文件明细/总量/增量相比较，从而避免自引用或手改指标。

## 标签与远端

先核对远端仍是可fast-forward的祖先，final/证明分支如已存在只能与本地相同，p2若已存在须停止并核对，不能force或移动任何标签。

```powershell
git ls-remote --heads --tags origin
git tag -a p2 -m "Phase 2: verified extension framework, plugins and reproducible evidence" HEAD
git push --dry-run --atomic origin refs/heads/master:refs/heads/master refs/heads/phase2/box-a-f5236b5:refs/heads/phase2/box-a-f5236b5 refs/heads/phase2/box-b-f5236b5:refs/heads/phase2/box-b-f5236b5 refs/tags/final:refs/tags/final refs/tags/p2:refs/tags/p2
git push --atomic origin refs/heads/master:refs/heads/master refs/heads/phase2/box-a-f5236b5:refs/heads/phase2/box-a-f5236b5 refs/heads/phase2/box-b-f5236b5:refs/heads/phase2/box-b-f5236b5 refs/tags/final:refs/tags/final refs/tags/p2:refs/tags/p2
node scripts/verify-phase2-delivery.mjs --revision p2 --metrics --remote
git status --short
```

最后一项须实际通过：远端master与p2提交一致、final原附注对象和提交不动、两证明分支SHA精确相同、p2附注对象及解引用提交与本地一致；源码和真实final/p2指标相同。atomic推送若服务拒绝应说明实际错误，不退回force。只有本地验收与远端核对均完成，Q-03及P2-6整体才标记完成。
