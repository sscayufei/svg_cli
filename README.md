# SVG CLI

使用 TypeScript 和 Node.js 编写的 SVG 命令行编辑器。通过交互命令创建图形、组织分组、编辑属性、撤销操作并读写 SVG；配套 VSCode 扩展提供 SVG 文件标记和原生大纲导航。

## 项目功能

- 内置矩形、圆、椭圆、线段、文本和分组，支持嵌套及整组移动、缩放。
- 支持属性编辑、层级调整、前后顺序、Undo/Redo 和 SVG 文件读写。
- 默认启用四个可选插件：`stats` 统计图形，`dir` 列出启动目录，`box` 创建带标题的复合图形，`tree-star` 标记未保存的内容变化。
- 可通过配置启用、禁用插件；内置能力独立于可选插件。
- VSCode 扩展在 Explorer 标记 SVG 文件，使用原生 Outline 展示层级、定位源码并响应编辑。

## 环境搭建

| 工具 | 要求 |
|---|---|
| Node.js | 24.x；项目声明范围为 `>=24 <25` |
| npm | 随 Node.js 安装，按仓库 `package-lock.json` 安装依赖 |
| Git | 克隆项目；对比历史版本时也需要 Git |
| VSCode | 仅使用配套扩展时需要；扩展声明支持 `^1.143.1`，自动宿主测试固定使用 1.143.1 |

进入仓库根目录后执行：

```powershell
node --version
npm.cmd --version
npm.cmd ci
npm.cmd run build
node dist/host/main.js
```

以上命令适用于 Windows PowerShell，macOS/Linux 将 `npm.cmd` 换为 `npm`。首次安装依赖需要访问 npm 源；项目不需要数据库、后端服务或全局安装 TypeScript。

**先构建，再运行。** CLI 通过各 workspace 包的 exports 加载编译产物，安装后直接启动可能找不到插件入口。修改源码后重新执行 `npm.cmd run build`。也可用 `npm.cmd run cli` 启动源码入口，但仍需先构建工作区包。`build:all` 会同时构建 CLI 和 VSCode 扩展。

## 快速开始

启动后出现 `svg>` 提示符。逐行输入下列命令，不要复制提示符：

```text
init 800 600
create g flow
create box start 120 100 160 60 "开始" in flow
create box next 520 100 160 60 "处理数据" in flow
create line arrow 280 130 520 130 black in flow
set next fill #f5a623
set next label "处理数据 v2"
tree
stats
save output.svg
```

在浏览器打开 `output.svg` 查看结果。树中的 `(box)` 表示复合图形，`*` 表示与最近成功保存、读取或初始化的内容不同；成功保存后消星。这些树标签不会写入 SVG。

继续尝试编辑和撤销：

```text
move next 0 100
undo
redo
set start label "完成"
tree flow
save output.svg
```

输入 `help` 查看当前已加载能力的完整语法。Windows 使用 **Ctrl+Z，再按 Enter** 退出；macOS/Linux 使用 **Ctrl+D**。

## 使用指南

### 创建与查看

ID 在当前文档中唯一。尾部 `in <容器ID>` 表示放入已有分组或 box；省略时放在 SVG 根下。

```text
init 800 600
create g scene
create rect r 20 30 120 60 #4a90d9 in scene
create circle c 240 80 30 in scene
create ellipse e 360 80 50 25 in scene
create line l 20 150 400 150 black in scene
create text title 20 200 "Hello SVG" in scene
tree
tree scene
show r
```

文字、路径中有空格时使用双引号。空文本 `""` 合法，引号中支持 `\"` 和 `\\`；只有未加引号的尾部 `in <容器ID>` 会解释为归属子句。

### 编辑与层级调整

| 命令 | 用途 |
|---|---|
| `move <id> <dx> <dy>` | 按位移移动节点；容器同时移动其子孙 |
| `scale <id> <factor>` | 按正比例缩放位置和尺寸；以原点为基准 |
| `set <id> <属性> <值>` | 修改图形支持的几何、样式或文本属性 |
| `delete <id>` | 删除节点及其子树 |
| `group <新组ID> <id1> <id2> ...` | 把至少两个节点组成新组 |
| `ungroup <组ID>` | 解散嵌套普通组；根级组和 box 不允许解散 |
| `addto <目标容器ID> <id>` | 移入目标容器末尾 |
| `front <id>` / `back <id>` | 调整同级绘制顺序 |
| `undo` / `redo` | 撤销或重做成功的编辑 |

矩形宽高属性名为 `width`、`height`，普通文本内容使用 `text`，box 标题使用 `label`：

```text
set r width 180
set r fill #f5a623
set title text "更新后的标题"
move scene 10 20
```

box 的矩形和文本是必要部件，可以普通编辑或同父调序，但不能分别删除、移出或被其他组收编。可以移动、缩放、分组或删除整个 box。详见 [box 使用说明](plugins/shape-box/README.md)。

### 读取与保存

```text
read demo.svg
save copy.svg
read "D:/drawings/示例.svg"
save "D:/drawings/修改后.svg"
```

- 相对路径以启动 CLI 时的工作目录解析，保存不自动创建父目录。
- 无参数 `save` 使用最近成功 `read` 的来源路径。显式 `save <路径>` **不会更新来源路径**；只做过 init 时应显式给出保存路径。
- 成功的 init、read、save 或画布尺寸修改会清空历史；下一条成功编辑开始新的 Undo/Redo 历史。查询和失败命令不清空历史。
- 新编辑清空 Redo；撤销到保存内容时，`*` 消失。

### 配置插件

不带 `--config` 使用默认代码装配。使用根配置：

```powershell
node dist/host/main.js --config plugins.config.json
```

也可创建自己的配置。例如保留统计、目录和 box，禁用星号：

```json
{
  "plugins": [
    { "module": "@svgframe/command-stats" },
    { "module": "@svgframe/command-dir" },
    { "module": "@svgframe/shape-box" },
    { "module": "@svgframe/tree-star", "enabled": false }
  ]
}
```

保存为 `plugins.custom.json`，执行 `node dist/host/main.js --config plugins.custom.json`。显式配置替换默认可选列表；`{"plugins":[]}` 禁用全部可选插件，仍保留内置命令和基础图形。

相对模块路径以配置目录为基准；disabled 完全跳过模块求值，options 原样交给插件验证。非法配置提示错误并仅使用内置能力启动。字段和错误说明见 [插件装配参考](doc/PLUGIN_LOADING.md)。

### 示例回放

[demo.svg](demo.svg) 可直接用浏览器打开；[examples/demo.cli](examples/demo.cli) 可重现基础流程图。PowerShell 回放中文命令前使用 UTF-8：

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Encoding UTF8 examples/demo.cli | node dist/host/main.js
```

## VSCode 扩展

CLI 和扩展可以分别使用。构建并打包扩展：

```powershell
npm.cmd run package:extension
```

在 VSCode 扩展视图选择 **Install from VSIX…**，安装 `.tmp/phase2/svg-cli-companion-0.2.0.vsix`，按提示重新加载窗口。在 Explorer 查看 SVG 文件的 `[]` 标记；用 **Text Editor** 打开 SVG，通过原生 **Outline** 查看层级并点击定位。

若默认打开为图片，使用 **Reopen Editor With… → Text Editor**。扩展不修改原文件；XML 不完整时暂时清空大纲，补全后恢复。也可选择调试配置 **SVG extension development host**，按 F5 启动开发宿主。详细方法见 [扩展 README](extensions/vscode-svg/README.md)。

## 注意事项

- 几何数值必须有限；尺寸和半径可为零，画布宽高及缩放比例必须为正。不接受 NaN、Infinity 或 CLI 几何参数中的单位。
- 普通组的样式写在组自身，按 SVG 继承规则生效，不覆盖孩子的显式样式。缩放不改变文本内容或 stroke-width。
- CLI 读写受限 SVG 子集：内置图形、分组、公共样式、文本和受支持的复合标记。transform、style、font-size、未知标签/属性、DTD 等会被拒绝，不能直接编辑任意绘图软件导出的 SVG。
- 未加载相应provider时，未知g的data-kind降为普通组；已加载但复合结构损坏时拒绝读取，重复ID始终拒绝。
- dir 只列启动目录直接条目，不递归、不跟随链接，不随read/save改变目录。
- 依赖、编译产物、原始日志和VSIX保持在工具约定的忽略目录；开发过程归档放 `.tmp/`，报告中需提交的新截图放 `doc/images/`。

## 常见问题

| 问题 | 处理方法 |
|---|---|
| PowerShell 禁止运行 npm.ps1 | 使用 `npm.cmd`，无需修改全局执行策略。 |
| 启动找不到包或dist/public.js | 在根目录执行 `npm.cmd ci`，再执行 `npm.cmd run build`。 |
| box或stats提示unknown | 检查配置是否启用对应插件、启动时是否有加载错误；显式配置不会自动补默认插件。 |
| undo not allowed after io command | 最近成功初始化、读写或修改了画布；先进行新编辑再撤销。 |
| no source path | 使用 `save output.svg`；无参数save需要先成功read。 |
| cannot write file | 检查父目录、路径和写权限，程序不自动创建父目录。 |
| 导入提示未知标签/属性 | 文件包含CLI不支持的SVG特性，使用受支持子集。 |
| 中文回放变成问号 | 使用UTF-8终端，并在PowerShell管道回放前设置上面的OutputEncoding。 |
| 大纲不显示或点击进入图片预览 | 确认扩展启用并以Text Editor打开，XML完整有效；Explorer的Badges需启用以显示文件标记。 |

## 文档与检查入口

- [项目报告](doc/README.md)：扩展点、双装配、架构变化、设计决策、AI协作检查，以及待填写的测试和截图位置。
- [扩展点参考](doc/EXTENSION_POINTS.md)、[装配参考](doc/PLUGIN_LOADING.md)、[设计决策ADR](doc/adr/001-attribute-transactions.md)。
- [第二阶段需求](docs/phase_cli_2.md)、[第一阶段需求](docs/phase_cli_1.md)、[历史源码指标](docs/metrics/README.md)。

可用 `npm.cmd test -- --maxWorkers=4`、`npm.cmd run check:tests` 自检；插件、加载器、兼容性和扩展运行的分项步骤见项目报告。真实宿主测试会打开隔离VSCode窗口，首次运行可能下载固定版本。
