# SVG CLI Companion：SVG 文件标记

P2-1a 已实现 Explorer 中 SVG 文件的 `[]` 标记。标记不改文件名或内容，不向父目录传播；普通文件、目录（包括 folder.svg）和无法读取类型的路径不标记。大小写扩展名均支持。SVG 原生大纲功能在 P2-1b 实现。

从仓库根目录执行：

```powershell
npm.cmd ci
npm.cmd run build:extension
npm.cmd run test:extension:unit
npm.cmd run test:extension
```

宿主测试默认下载固定的 VSCode 1.143.1 到 `.vscode-test/`。每次创建独立用户目录/扩展目录并复制 fixture，测试修改只发生在临时副本中。输出在 `.tmp/phase2/extension-*/`：host.json、badge-checks.json 和真实窗口 svg-badge.png。测试脚本清除自身继承的 ELECTRON_RUN_AS_NODE，避免宿主被当作 Node 启动。界面检查使用仅测试宿主启用的随机本地 CDP 端口，不引入额外浏览器依赖。

测试在尚未打开 SVG 时核对自动激活、Explorer 的实际徽标；同时检查创建/修改/重命名/删除刷新、目录排除、取消/读取失败，以及 fixture 文件名/字节保持不变。

复现原生大纲观察（使用内置 TypeScript 提供者，不是本扩展的 SVG 大纲）：

```powershell
$env:SVG_OBSERVE_OUTLINE = '1'
npm.cmd run test:extension
Remove-Item Env:SVG_OBSERVE_OUTLINE
```

会打开 outline-observation.ts，验证层级与折叠/展开，点击 finish 定位第 7 行，将其临时改为 complete 并观察更新，最后还原。观察 JSON 和前后截图写入该次临时目录。

使用已有安装（必须匹配版本）的方式：

```powershell
$env:SVG_VSCODE_EXECUTABLE = 'D:/VSCode/Microsoft VS Code/Code.exe'
npm.cmd run test:extension
Remove-Item Env:SVG_VSCODE_EXECUTABLE
```

若本机 VSCode 正在更新而拒绝启动，使用默认的独立下载目标，不干预更新进程。

在 VSCode 中打开仓库根目录，选择 “SVG extension development host”，按 F5。预启动任务先类型检查和 bundle，打开专用 fixtures；调试用户数据放在 `.tmp/phase2/debug-user-data`，不读取个人扩展配置。启动后无需打开 SVG，example.svg 行尾应显示 []，plain.txt 和 folder.svg 目录不显示。文件装饰需要 Explorer 的 Badges 设置处于启用状态。

扩展包采用 CommonJS，与根 CLI 的 ESM 分开；esbuild 打包入口为 dist/extension.cjs，vscode 由宿主提供，其他被实际使用的依赖纳入 bundle。生产 bundle 与供单元/宿主测试使用的 tsc 输出都在忽略的 dist 中。本阶段未生成 VSIX。

提供者通过 workspace.fs.stat 判断文件类型，FileSystemWatcher 监听变化并发出失效通知；重命名使旧/新路径分别刷新。它不缓存文件内容，不扫描整个工作区；链接是否指向普通文件由 VSCode 文件系统提供的类型位决定。读取失败或取消时返回空装饰。扩展释放时注销提供者、监听和事件资源。
