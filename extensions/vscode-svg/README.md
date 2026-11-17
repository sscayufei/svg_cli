# SVG CLI Companion：P2-0 开发骨架

目前只提供激活/资源释放生命周期；文件标记与大纲在 P2-1 实现。

从仓库根目录执行：

```powershell
npm.cmd ci
npm.cmd run build:extension
npm.cmd run test:extension:unit
npm.cmd run test:extension
```

宿主测试默认下载固定的 VSCode 1.143.1 到 `.vscode-test/`。每次创建独立用户目录/扩展目录，测试输出在 `.tmp/phase2/extension-*/host.json`，包含实际宿主版本、激活及释放结果。测试脚本清除自身继承的 ELECTRON_RUN_AS_NODE，避免宿主被当作 Node 启动。

使用已有安装（必须匹配版本）的方式：

```powershell
$env:SVG_VSCODE_EXECUTABLE = 'D:/VSCode/Microsoft VS Code/Code.exe'
npm.cmd run test:extension
Remove-Item Env:SVG_VSCODE_EXECUTABLE
```

若本机 VSCode 正在更新而拒绝启动，使用默认的独立下载目标，不干预更新进程。

在 VSCode 中打开仓库根目录，选择 “SVG extension development host”，按 F5。预启动任务先类型检查和 bundle，打开专用 fixtures；调试用户数据放在 `.tmp/phase2/debug-user-data`，不读取个人扩展配置。当前不会出现标记/大纲功能，这些属于下一阶段。

扩展包采用 CommonJS，与根 CLI 的 ESM 分开；esbuild 打包入口为 dist/extension.cjs，vscode 由宿主提供，其他被实际使用的依赖纳入 bundle。生产 bundle 与供单元/宿主测试使用的 tsc 输出都在忽略的 dist 中。本阶段未生成 VSIX。
