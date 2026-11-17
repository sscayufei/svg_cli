# SVG CLI Companion：SVG 文件标记与原生大纲

Explorer 中 SVG 文件显示 `[]` 标记。标记不改文件名或内容，不向父目录传播；普通文件、目录（包括 folder.svg）和无法读取类型的路径不标记。以文本方式打开 SVG 后，原生 Outline 展示根、容器和叶子，有 id 时为 标签名#id，无 id 仅显示标签名；点击跳转，未保存编辑后更新。不完整或非法 XML 暂时清空大纲，补全后恢复。大小写扩展名均支持，不依赖文件的语言标识。

## 以文本方式打开

如果 SVG 默认进入 Image Preview，使用 “Reopen Editor With… → Text Editor”，并为 *.svg 配置默认文本编辑器。否则原生大纲点击资源时可能重新解析到图片预览。仅在目标工作区的 `.vscode/settings.json` 设置：

```json
{
  "workbench.editorAssociations": {
    "*.svg": "default",
    "*.SVG": "default"
  }
}
```

专用 fixtures 已包含该设置；扩展不会自动更改用户全局或工作区偏好。未命名 untitled 文档不在本版本的路径选择范围内。解析为语法视图，不校验完整 SVG 规范；DOCTYPE 拒绝并清空，不处理外部实体。

从仓库根目录执行：

```powershell
npm.cmd ci
npm.cmd run build:extension
npm.cmd run test:extension:unit
npm.cmd run test:extension
```

宿主测试默认下载固定的 VSCode 1.143.1 到 `.vscode-test/`。每次创建独立用户目录/扩展目录并复制 fixture，测试修改只发生在临时副本中。输出在 `.tmp/phase2/extension-*/`：host.json、badge-checks.json 和真实窗口 svg-badge.png。测试脚本清除自身继承的 ELECTRON_RUN_AS_NODE，避免宿主被当作 Node 启动。界面检查使用仅测试宿主启用的随机本地 CDP 端口，不引入额外浏览器依赖。

测试在尚未打开 SVG 时核对自动激活、Explorer 的实际徽标；同时检查创建/修改/重命名/删除刷新、目录排除、取消/读取失败，以及 fixture 文件名/字节保持不变。随后验证 SVG 原生大纲层级、无 id、真实点击定位、未保存编辑、错误 XML 后恢复、CRLF/emoji/命名空间偏移，并保存截图和 outline-checks.json。

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

## VSIX 打包与隔离安装验证

从仓库根目录执行：

```powershell
npm.cmd run package:extension
$env:SVG_TEST_VSIX = '.tmp/phase2/svg-cli-companion-0.2.0.vsix'
npm.cmd run test:extension
Remove-Item Env:SVG_TEST_VSIX
```

VSIX 位于 .tmp/phase2，使用本地 vsce 打包，不发布市场。安装验证将包安装到操作系统临时目录的独立 extensions 目录；被测 SVG 扩展只从已安装位置加载。VSCode 测试框架需要开发模式，因此另建一个不含代码的空测试驱动目录作为 extensionDevelopmentPath，不将 SVG 源码包作为开发扩展加载。完整执行相同标记/大纲测试，核对版本、安装路径不在仓库内且不带 node_modules。普通人工安装也可通过 Extensions → Install from VSIX 选择该文件；首次查看以文本编辑器打开包内示例 SVG。

扩展包采用 CommonJS，与根 CLI 的 ESM 分开；esbuild 打包入口为 dist/extension.cjs，vscode 由宿主提供，saxes/xmlchars 被打入 bundle。VSIX 仅包含 manifest、README、bundle 和示例，不携带源码测试、调试目录、node_modules 或个人配置。bundle-meta.json 与 vsix-package.json 分别记录构建输入、外部模块及包大小/哈希，供产物核验。

提供者通过 workspace.fs.stat 判断文件类型，FileSystemWatcher 监听变化并发出失效通知；重命名使旧/新路径分别刷新。它不缓存文件内容，不扫描整个工作区；链接是否指向普通文件由 VSCode 文件系统提供的类型位决定。读取失败或取消时返回空装饰。扩展释放时注销提供者、监听和事件资源。
