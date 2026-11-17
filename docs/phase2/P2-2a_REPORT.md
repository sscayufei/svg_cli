# P2-2a：包边界与注册式内核

日期：2026-11-17。前置提交 c093c7f（P2-1b），开始时工作区干净。状态：已提交 dc27435；不是框架冻结节点。下文保留本阶段执行时记录，后续事务升级见 [P2-2b_REPORT.md](P2-2b_REPORT.md)。

## 实现与目录映射

| 原位置 | 新位置/责任 |
|---|---|
| src/domain | src/core/domain：封装节点、文档、容器、局部变更；五类叶子移至 builtin-shapes |
| ShapeFactory | src/core/application/ShapeFactory：只查 provider 注册表的创建/恢复/help/反馈服务 |
| src/application | src/core/application：会话、历史、查询、公开可逆协议和抽象命令基类 |
| 十九条具体命令 | plugins/builtin-commands/src：具体命令、参数规则、help 与注册类 |
| 六类型工厂固定表 | plugins/builtin-shapes/src：六个 provider 类、通用校验基类及具体叶子 |
| src/cli | src/host/cli：REPL、分词、通用结果/树渲染、查表分发；main/composition 位于 src/host |
| src/infrastructure/svg | src/host/svg：XML/文件系统适配器，通过 core public 依赖领域 |

core、builtin-shapes、builtin-commands 成为独立 npm workspaces，根锁文件统一管理；根包声明三个本地版本依赖。插件仅导入 @svgframe/core 和包内实现，core 不依赖具体插件或宿主。公开出口不暴露 TreeAccess 内部符号；保留 SvgGroup 作为通用容器基类，g 的创建/读回由 provider 注册。

四类扩展接口位于 core；ExtensionRegistry 为每类保持注册顺序、查找、重名/方法契约校验。默认组合根显式安装内置包，空核心无隐藏默认类型或命令。动态帮助来自命令和形状注册表，保持原先十九命令/六图形顺序。

新增通用 lines 结果与预生成创建/属性反馈；输出在写文档前校验，undo/redo 可使用领域反馈。历史消费公开 ReversibleCommand 协议；NodeSnapshot 增加语义/显示类型与容器身份。根和节点均可追加标签，无标签字节不变。

实际接口、调用文件/函数、实现、缺省与错误行为见 [扩展点清单](../../doc/EXTENSION_POINTS.md)。

## 构建与测试迁移

build-workspaces.mjs 根据工作区清单和依赖拓扑构建，不硬编码具体插件名称；每次验证目标路径在工作区内后清理 dist，避免遗留编译产物制造成功。顺序是 core → 插件 → host；build:all 再包括独立 VSCode 包。core/插件生成 JS 与声明文件，host 最终入口为 dist/host/main.js。

测试通过 test/support/composition 显式注入真实内置形状服务，或在插件包独立测试中使用替身；不把具体类型重新藏回内核。旧集成测试仅更新入口/导入与显式依赖，预期 stdout/stderr/SVG 未改。原架构检查按新边界迁移，新增14项扩展契约测试与两个插件包共4项独立测试。

新增 check:tests 首次对测试源码类型检查，发现旧 AtomicFileWriter 测试替身把 writeFileSync 参数窄化为 number，现放宽为 Node 定义的 PathOrFileDescriptor；场景、写入逻辑和断言保持不变。

## 实际验证

| 命令 | 结果 |
|---|---|
| npm.cmd install --no-audit --no-fund | 创建3个本地 workspace 关联，根锁文件更新，无新增第三方包 |
| npm.cmd run build:all | 干净 core/插件/host/扩展构建通过 |
| npm.cmd run check:tests | 所有 CLI/插件测试源码严格类型检查通过 |
| npm.cmd test | 27 文件 / 232 项通过 |
| npm.cmd test --workspace @svgframe/builtin-shapes | 独立2项通过，只依赖 core |
| npm.cmd test --workspace @svgframe/builtin-commands | 独立2项通过，使用形状服务替身，不依赖形状插件或 host |
| npm.cmd run test:all | 运行时点的228项主测试、8项扩展单测及真实宿主均通过；后新增4项包测试已另行运行完整232项 |
| npm.cmd run verify:baseline | 三份 final 会话原始 stdout/stderr、生成 SVG 逐字节一致 |

[最终基线摘要](../../doc/evidence/phase2/p2-2a-baseline.json)、[扩展宿主回归](../../doc/evidence/phase2/p2-2a-extension-host.json) 已归档。基线脚本只更改当前入口，历史 final 仍使用它原来的 src/cli/main.ts 和 dist/cli/main.js；没有用新源码假装历史基线。

## AI 建议核验与修正

1. 没有保留默认参数中的固定 ShapeFactory：会话和读入器由组合根注入注册服务，测试也显式装配。
2. 避免源码类与 package exports 的编译类并存导致 instanceof 身份分裂：测试中的核心依赖统一经 @svgframe/core 导入。
3. 架构扫描最初使用旧 createSourceFile API，实际安装的 TypeScript 7 根导出只含版本信息；改用固定版本的 unstable/sync 原生快照和 unstable/ast，在 finally 释放 API。未降级或额外安装另一份 TypeScript。
4. ShapeFactory 因消费扩展 help/反馈属于应用服务，放在 core/application，保持 domain 依赖方向；架构测试单独守卫 domain 内部依赖。
5. 创建反馈在插入前验证，防止格式错误造成已编辑但无历史；完整任意处理器部分写入回滚仍属于下一阶段，不虚报已经实现。
6. build:all 在沙箱中遇 esbuild spawn EPERM，按权限流程获准重跑通过；不是删除或绕过扩展构建。

## 范围与后续

当前 AttributeHandler 是纯计划/ChangeSet 契约，plan 不得直接改文档。P2-2b 会完成受控事务、部分修改失败恢复、复合容器策略、SVG 描述与生命周期事件；P2-2c 再完成 manifest/加载器/安装回滚/目录适配器和首次指标。

未提前实现 stats/dir/box/star，未打框架冻结标记，也未把直接 activate 视作最终 A/B 安装路径。新增插件零核心修改的 Git 证明从后续冻结基线开始，本次本身是允许改动核心的重构提交。

未执行 git add/commit/push/tag。建议提交：`refactor(core): introduce extension contracts and register built-in features`。审阅提交后进入 P2-2b。
