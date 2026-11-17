# P2-1b：SVG 大纲与第一部分交付

日期：2026-11-17。前置提交：`5a5bcbf`（P2-1a），开始时工作区干净。状态：本地验收通过，待审阅提交。第一部分 A.1/A.2/A.3 已完成本地交付。

## 实现

- SvgOutlineParser：独立语法树、原始 id、任意元素与嵌套、UTF-16 源码偏移；非法/不完整 XML 清空，禁止 DOCTYPE。
- SvgDocumentSymbolProvider：注册原生 Outline，按路径匹配 SVG，不依赖 languageId；根/容器/叶子层级、完整 range 与标签 selectionRange；取消/版本变化丢弃结果。
- 注册与释放纳入既有 ExtensionLifecycle；无自建 TreeView、SVG 预览或领域模型依赖。
- 扩展版本更新为 0.2.0；加入精确版本 @vscode/vsce 4.1.1 与根锁文件变化；增加 package:extension 和 bundle/归档证据。
- VSIX 白名单只含 manifest、README、bundle 和示例；saxes/xmlchars 打入 bundle，vscode 为唯一外部模块。
- 扩展 README 提供开发/安装/文本编辑关联步骤；正式 [VSCode 实践说明](../../doc/VSCODE_EXTENSION.md) 完成 A.3 调用关系、模式差异及复用分析。

本阶段未迁移 CLI 模块、未实现插件内核；这些属于后续 P2-2。

## 验证结果

| 命令/场景 | 实际结果 |
|---|---|
| npm.cmd install --no-audit --no-fund | 安装 vsce 及依赖，根锁文件更新 |
| npm.cmd run build:extension | 严格类型检查与 bundle 通过 |
| npm.cmd run test:extension:unit | 8 项通过，包括语法树、偏移、异常恢复、2000 层嵌套及原标记/生命周期 |
| 开发宿主 test:extension | 标记、大纲层级、无 id、真实点击第 3 行、未保存编辑、错误后恢复通过 |
| npm.cmd run package:extension | VSIX 成功生成，6 个归档文件；构建输入/外部模块检查通过 |
| SVG_TEST_VSIX 模式 test:extension | 仓库外临时目录安装后，同一真实标记/大纲测试通过，退出码 0 |
| npm.cmd run build | CLI 编译通过 |
| npm.cmd test | 24 文件 / 214 项原有测试通过 |

安装版额外验证：版本 0.2.0、extensionPath 不在仓库内、不存在 node_modules；实际注册的 provider 来自已安装 bundle。VSCode 只在开发模式调用 extensionTestsPath，因此另建空测试驱动作为开发目录，驱动不含源码和 provider，不以仓库 SVG 扩展源码替代安装包。

宿主测试覆盖取消、版本变更丢弃，XML 语言模式下的大写 .SVG 路径，CRLF/emoji/命名空间范围；截图验证并非仅检查数据。XML 异常清空后，API 与原生 Outline 均恢复。测试只编辑 fixture 的临时副本，最后还原；扩展本身不写文件。

## 证据

- [真实大纲定位截图](../../doc/evidence/phase2/p2-1b-svg-outline-navigation.png)
- [未保存编辑后的更新](../../doc/evidence/phase2/p2-1b-svg-outline-updated.png)
- [不完整 XML 清空](../../doc/evidence/phase2/p2-1b-svg-outline-incomplete.png) / [补全恢复](../../doc/evidence/phase2/p2-1b-svg-outline-recovered.png)
- [安装版宿主结果](../../doc/evidence/phase2/p2-1b-outline-checks.json) / [加载路径与环境](../../doc/evidence/phase2/p2-1b-host.json)
- [VSIX 哈希/构建输入](../../doc/evidence/phase2/p2-1b-vsix-package.json) / [归档清单](../../doc/evidence/phase2/p2-1b-vsix-entries.json)

VSIX 本体在忽略的 `.tmp/phase2/svg-cli-companion-0.2.0.vsix`，可通过 package:extension 重建。依赖包、测试缓存和打包产物不计入后续 CLI 重构指标。

## 检查、修正与工程取舍

1. 没有直接复用 SvgReader：其领域校验/补 ID 破坏大纲的只读语义，另建语法解析器。保留共同依赖 saxes。
2. 通过 CRLF/emoji 测试确认 parser.position 为所需 UTF-16 偏移；避免将 XML column 直接当编辑器列数。
3. UI 检查发现真实单击曾切回 SVG 图片预览。为专用演示工作区明确文本编辑器关联，并在使用说明中写清配置条件；不修改用户全局偏好，也不删除点击断言。
4. 完善 CDP 鼠标状态，确保测试确实向目标行发出带按键状态的事件；最终截图和 editor selection 同时验证定位。
5. 单独安装版测试初次未触发 VSCode 的测试回调，查明其需开发模式。增加空驱动而不加载 SVG 源码包，最终核验实际 extensionPath，避免把开发成功当作安装成功。
6. 未命名文件、DOCTYPE、完整 SVG 规范、真实图片预览不在本版本范围；源码路径选择器和错误清空策略均写入 README。
7. 复核恢复截图发现 API 恢复早于原生视图刷新；将等待条件改为真实标签节点与 rect#start 再现，并记录 recoveredUi，最终安装版重跑通过且截图已更正。已比对安装 bundle 与当前构建的 SHA-256，相同。

## 变更与后续

生产改动在 extensions/vscode-svg 与宿主测试/打包脚本，新增依赖只用于扩展开发；CLI src 及原有测试期望未改。正式报告与开发计划已同步。未执行 commit/push/tag。

建议提交：`feat(vscode): add SVG outline navigation and extension evidence`。

下一阶段 P2-2a：包边界、四扩展点与内置实现注册化。在本阶段审阅提交后开始。
