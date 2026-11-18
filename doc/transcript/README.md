# 可复用命令会话与回放fixture

这里是测试输入，不是开发过程日志。集成测试和验证脚本直接使用这些文件，需随项目保留。

| 文件 | 用途 |
|---|---|
| cli-1.txt、cli-1-flowchart.txt、cli-1-basics.txt | 原有能力、流程图和基础错误/历史边界 |
| cli-2-stats.txt、cli-2-commands.txt | stats与dir |
| cli-2-box.txt | box讲义会话及恢复/转义 |
| cli-2-star.txt | 双标签状态机回归 |
| cli-2-star-release.txt | 最终全集合双标签会话，保存目标位于被列目录外 |
| expected/ | final原始黄金输出或新功能人工核对的语义预期 |
| inputs/、plans/ | 固定SVG/目录种子、插件配置、回放计划 |

TXT仅含命令/注释，不含svg>或预期输出，使用UTF-8。不要从待测实现盲目生成预期后直接当标准。

## 原始兼容比较

```powershell
npm.cmd run build
$env:SVG_CLI_ENTRY='test/fixtures/entries/no-optional.mjs'
npm.cmd run verify:baseline
Remove-Item Env:SVG_CLI_ENTRY
```

工具需要正确final标签，从Git导出历史src/package/lock/tsconfig并按历史锁构建，可能访问网络；新旧CLI在同一cwd顺序重置初始文件后运行，Buffer级比较两流与生成SVG，不去提示符/trim/改换行。cli-2会话不混入final旧能力比较。

## 双装配比较

```powershell
npm.cmd run verify:assemblies -- doc/transcript/plans/box.json
node scripts/verify-phase2-release.mjs
```

前者运行指定plan，后者用真实main/default A与同一main/root配置B回放六份四插件会话；可用--source指定已构建源码目录。集合/顺序/options、输入和cwd相同，目录内/外生成物一并捕获；最终dir会话日志和保存目标在被列cwd之外。原始A/B比较独立于去提示符后的人工预期语义检查。

输出在 `.tmp/phase2/` 各次生成目录，保持本地即可。源码快照没有Git根时，从实际仓库调用历史导出器，并用SVG_CLI_ENTRY指向干净构建目录的no-optional.mjs绝对路径。测试命令、实际结果和截图由作者填写 [项目报告](../README.md) 第8节。
