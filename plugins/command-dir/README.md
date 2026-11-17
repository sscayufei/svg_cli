# @svgframe/command-dir

独立 query 插件，仅依赖 core public 的 DirectoryPort、CommandDefinition 和通用结果接口；没有 Node、SVG 会话或其他插件依赖。

`dir` 不接受参数，读取注入服务的启动目录直接子项；过滤 `.`/`..`，保留隐藏项。按目录、文件、链接、其他项分组，每组用大小写敏感的 JS 字符串顺序排序，不使用 localeCompare；标记后固定两个空格：

```text
[DIR]  docs
[FILE]  .hidden
[FILE]  Z.txt
[FILE]  alpha.txt
[LINK]  shortcut
[OTHER]  device
```

空目录输出 `(empty directory)`；读取异常统一为 `cannot read directory: <path>`，error 前缀由宿主添加。结果通过 lines 返回，不直接打印、不改输入条目、不缓存目录内容、不消费 options。每次执行重新读取，可以在后端恢复后再次成功。

DirPlugin 默认导出为类，activate 只需要 commands 和 directory。DirCommand 是 Adapter 的客户端，DirectoryPort 为目标接口；生产注入冻结宿主的 NodeDirectoryAdapter，它适配 Node readdir/Dirent，不跟随链接、不递归、不 chdir。插件独立测试用端口替身，不 import 宿主或内置命令。

```powershell
npm.cmd run build
npm.cmd test --workspace @svgframe/command-dir
node dist/host/main.js
node dist/host/main.js --config doc/transcript/inputs/commands.plugins.json
```

默认 A 启用 stats、dir；配置方式使用 `{ "module": "@svgframe/command-dir" }`，可以单独启用或设置 enabled:false 禁用。根配置当前仍为空列表，所有可选贡献可显式禁用。SVG read/save 不改变目录，查询成功或失败不修改文档、来源、保存点观察状态、双栈或历史屏障。
