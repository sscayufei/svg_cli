# P2-0 执行记录

日期：2026-11-16。开始 HEAD：`0ebd382699f345699032eea05688b47ecd854340`；final 源码：`2054ec5667ad2e5f16b9b52ddd75a3435ed63c9d`。状态：本地验收通过，待用户审阅提交。

## 实现

- 扩展 workspace `svg-cli-companion`，固定类型/测试/bundle 工具版本；根 package-lock 统一管理。
- CommonJS 扩展入口、严格类型检查、ES2022/Node22 bundle、源码映射、激活/释放生命周期。
- `.vscode/launch.json` 与任务：F5 构建后启动隔离开发宿主，打开专用 fixture；个人设置不变。
- 单元测试和 @vscode/test-electron 真实宿主烟测，宿主测试同时核对固定 VSCode 版本。
- 三份纯命令 transcript、固定 SVG 输入、final 原始 stdout/stderr 黄金文件。
- 历史导出/锁文件安装/构建/回放工具：逐字节比较 stdout/stderr 与生成文件，保留 SHA-256 和两侧原文件。
- 忽略测试下载/用户目录/临时日志/产物，针对新增 fixture 与扩展配置指定 LF。

没有修改 src 中的 CLI 业务实现，没有实现文件标记、大纲、可选插件或框架迁移；这些仍按后续阶段进行。

## 验证

| 实际命令 | 结果 |
|---|---|
| npm.cmd install --no-audit --no-fund | 成功，安装 40 个包，更新根锁文件 |
| npm.cmd run build | CLI 严格编译通过 |
| npm.cmd test | 24 文件 / 214 项通过 |
| npm.cmd run build:extension | 类型检查与 esbuild bundle 通过 |
| npm.cmd run test:extension:unit | 1 项通过：逆序释放且重复 dispose 不重复释放 |
| npm.cmd run test:extension | 真实宿主测试通过，最终退出码 0 |
| npm.cmd run verify:baseline | 3 会话的原始 stdout/stderr 和生成文件一致 |
| SVG_CLI_ENTRY 指向故意错误的临时入口后回放 | 正确以退出码 1 拒绝 raw stdout 差异；外层反向检查通过 |

宿主信息：[p2-0-host.json](../../doc/evidence/phase2/p2-0-host.json)，实际 VSCode 1.143.1、Node 24.21.0、Electron 43.7.7；基线摘要：[p2-0-baseline.json](../../doc/evidence/phase2/p2-0-baseline.json)。完整临时日志和运行目录由 JSON/脚本输出记录，临时路径不作为跨机器依赖。

黄金文件在 [doc/transcript/expected](../../doc/transcript/expected)，从 final 捕获；基础、典型会话、流程图分别独立重建相同 cwd。二进制比较不使用原测试的 normalize，也没有移除提示符/空白。当前 CLI 的业务代码与 final 相同，这是后续重构时的对照起点。

F5 配置和操作说明已提供，真实激活通过自动 Extension Host 验证；本轮没有人工按 F5 或制作功能截图，文件标记/大纲截图在 P2-1 交付。

## 检查与修正

| 建议/实现 | 核验与修正 |
|---|---|
| 给扩展使用带 scope 的 npm 名称 | VSCode manifest 的 name 不适合 scope，改用 svg-cli-companion；CLI 插件包命名不受影响 |
| 在 ES2022 中使用 toReversed | 类型检查发现目标不支持，改用复制后 reverse，不提高运行目标 |
| 直接启动本机 VSCode 测试 | 首次继承 ELECTRON_RUN_AS_NODE 导致按 Node 启动；测试脚本清除自身环境标志 |
| 本机宿主可复用 | 更新锁使其拒绝启动；工具下载固定版本隔离副本完成验证，没有干预更新进程 |
| 旧测试足以验证输出 | 旧测试会规范化；补充 Buffer 对比和生成文件哈希，并用故意错误入口反向验证工具 |

安装/子进程/真实 GUI 宿主在沙箱中需要相应权限，按工具流程获准执行。测试宿主内置组件输出了一些 proposal/channel 日志，但扩展测试完成且进程退出码为 0；这些日志未被当作产品输出黄金文件。

## 后续与提交

建议提交：`chore(phase2): prepare extension environment and final compatibility harness`。

开始时已有的未跟踪评审/phase2 计划文档一并保留，未自行 git add/commit/push/tag。下一阶段 P2-1a 在审阅提交后实施文件标记与原生大纲行为观察；VSIX 打包留在 P2-1b。
