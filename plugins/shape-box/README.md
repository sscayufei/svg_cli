# @svgframe/shape-box

独立复合图形插件，只依赖 @svgframe/core public。默认导出 BoxPlugin 类，注册 shape/box、attributes/box-fill 与 box-label、decorators/box-type-label；不增加命令或修改内置实现。

```text
create box n1 120 100 160 60 "开始"
set n1 fill #f5a623
set n1 label "处理数据 v2"
```

创建模板包含 `<id>-rect` 和 `<id>-label` 两个直接孩子，矩形默认 #4a90d9，文本位置固定为 x+20、y+35；宽高允许零，空标题合法。BoxShape 的语义类型为 box、树基础标题为 g，XML 为 g 加 data-kind="box"。类型标签通过独立的 BoxTypeDecorator 追加 (box)，不改渲染器。

provider 通过 ShapeConstructionPort 请求基础 rect/text，以 SubtreeBuilder 一次组装离线子树。创建前检查全子树 ID/归属，缺基础能力或冲突时不挂接。必要部件必须是直接的 rect/text 叶子；允许额外孩子、普通组和嵌套 box。整体 move/scale/delete/group/addto 可用，必要部件可以普通编辑或同父 front/back，直接 delete/移出/group 收编会拒绝。ungroup 包括根级 box 均报 composite shape 错误。

fill 处理器只改本 box 的矩形，不修改根 g 或递归传播到嵌套 box；label 只改本 box 的文本。每条 set 是一个可逆单元，redo 重放记录；处理器只用 AttributeEdits 门面，失败由冻结事务恢复。无处理器时，fill/stroke/stroke-width 依普通 g 规则修改自身，label 仍为未知属性。

读回使用完整 restore：只接受合法组样式和空白的组文本，检查必要部件 ID/类型/直接归属；缺失或损坏拒绝整次 read。旧 fromAttributes 没有子树，明确拒绝，不能据此制造不完整 box。未安装 provider 时，由冻结宿主静默降级普通 g，保留合法样式/孩子并移除标记；重复 ID 始终拒绝。

创建反馈遵循讲义；label 反馈用 JSON 字符串保留空值和转义。fill undo 反馈显示旧值的 JSON 表示，缺席时为 (unset)，实际恢复仍保留属性缺席。BoxShape 的结构检查/释放策略不负责修改状态。

```powershell
npm.cmd run build
npm.cmd test --workspace @svgframe/shape-box
node dist/host/main.js --config doc/transcript/inputs/box.plugins.json
npm.cmd run verify:assemblies -- doc/transcript/plans/box.json
```

单包测试只使用 core public、基础构建替身与测试命令，不 import host、内置形状/命令或其他插件。真实 rect/text、完整读写与讲义会话由根 integration/box 测试覆盖。通用功能回放使用显式三插件 A 列表及同集合配置；真实独立 C_A/C_B 接入证明还需使用同一 F 的两个提交和真实 main/root 配置验证。
