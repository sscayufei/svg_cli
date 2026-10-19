# Lab1 Phase 1 — SVG 命令行编辑器实验报告

本项目使用 TypeScript、Node.js 和面向对象设计，实现六种内置 SVG 图形、19 条命令、嵌套分组、精确 Undo/Redo 及 SVG 读写。原始需求为 [phase_cli_1.md](../docs/phase_cli_1.md)，优先于设计建议。本文记录真实实现和分阶段协作过程，不依赖被忽略的本地设计文件才能理解方案。

2026-10-17，M8 本地自动验收完成：构建通过，24 个测试文件、214 项测试通过；编译后完整会话与浏览器预览通过。M8 用户验收、最终 Git 提交、推送及 final 标签仍待用户完成。

## 架构方案

### 模块划分

| 模块 | 主要类/接口 | 职责 |
|---|---|---|
| `src/domain` | SvgNode、五种叶子、SvgGroup、SvgDocument、SceneEditor、GeometryState、ChangeSet、ShapeFactory | 封装几何/样式、树和 ID 不变量、统一操作、跨节点事务及局部可逆变更；不依赖 XML/文件系统 |
| `src/application` | EditorSession、CommandExecutor、CommandHistory、SceneQuery | 文档和来源生命周期、用例执行边界、历史状态和查询投影 |
| `src/application/commands` | Command、EditCommand、NodeEditCommand、具体命令 | 封装请求及执行记录，委托 Receiver，不承担 CLI 解析或 XML 操作 |
| `src/application/ports` | SvgReadPort、SvgSavePort | 应用拥有的窄文件接口；返回完整候选及警告 |
| `src/infrastructure/svg` | SvgReader、SvgWriter、SvgFileStore、AtomicFileWriter | XML 解析/序列化、UTF-8、来源路径解析及文件替换，实现应用端口 |
| `src/cli` | SvgCli、CommandTokenizer、CommandDispatcher、NodeFormatter、ResultFormatter、main | REPL、参数解析、命令构造、结果显示；main 装配具体依赖 |
| `test`、`examples` | 分层测试、精确会话基线、demo.cli | 独立回归证据和可复现示例，不参与生产依赖 |

```drawio
<mxfile>
  <diagram id="GBQr5sh85MB8I5eZ5CNh" name="第 1 页">
    <mxGraphModel dx="1287" dy="1693" grid="1" gridSize="10" guides="1" tooltips="0" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <UserObject label="" plantUmlData="{&#xa;  &quot;data&quot;: &quot;@startuml\nskinparam packageStyle rectangle\npackage \&quot;cli\&quot; as CLI {\n  component \&quot;main (composition root)\&quot; as MAIN\n}\npackage \&quot;application\&quot; as APP {\n  package \&quot;ports\&quot; as PORTS\n}\npackage \&quot;domain\&quot; as DOMAIN\npackage \&quot;infrastructure/svg\&quot; as INFRA\nCLI ..&gt; APP : requests / results\nMAIN ..&gt; INFRA : construction / injection\nAPP ..&gt; DOMAIN : receivers / model\nPORTS ..&gt; DOMAIN : document contract\nINFRA ..&gt; PORTS : implements\nINFRA ..&gt; DOMAIN : parse / serialize\n@enduml&quot;,&#xa;  &quot;config&quot;: null&#xa;}" id="plantuml-1">
          <mxCell connectable="0" parent="1" style="group;transparentBounds=1;editIcon=1;lockedGroup=0;groupPadding=10;" vertex="1">
            <mxGeometry as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="cli" plantUmlId="c_0" plantUmlBaseStyle="rounded=1;absoluteArcSize=1;arcSize=5;fillColor=none;strokeColor=#181818;verticalAlign=top;align=center;spacingTop=2;fontSize=14;fontStyle=1;whiteSpace=wrap;" plantUmlBaseValue="cli" id="c_0">
          <mxCell parent="plantuml-1" style="rounded=1;absoluteArcSize=1;arcSize=5;fillColor=none;strokeColor=#181818;verticalAlign=top;align=center;spacingTop=2;fontSize=14;fontStyle=1;whiteSpace=wrap;" vertex="1">
            <mxGeometry height="95" width="225" x="16" y="6" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="main (composition root)" plantUmlId="n_1" plantUmlBaseStyle="rounded=1;absoluteArcSize=1;arcSize=6;fillColor=#F1F1F1;strokeColor=#181818;fontSize=14;whiteSpace=wrap;" plantUmlBaseValue="main (composition root)" id="n_1">
          <mxCell parent="c_0" style="rounded=1;absoluteArcSize=1;arcSize=6;fillColor=#F1F1F1;strokeColor=#181818;fontSize=14;whiteSpace=wrap;" vertex="1">
            <mxGeometry height="49" width="195" x="15" y="34" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="" plantUmlId="ci_2" plantUmlBaseStyle="rounded=0;fillColor=#F1F1F1;strokeColor=#181818;" plantUmlBaseValue="" id="ci_2">
          <mxCell parent="c_0" style="rounded=0;fillColor=#F1F1F1;strokeColor=#181818;" vertex="1">
            <mxGeometry height="10" width="15" x="190" y="39" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="" plantUmlId="ci_3" plantUmlBaseStyle="fillColor=#F1F1F1;strokeColor=#181818;" plantUmlBaseValue="" id="ci_3">
          <mxCell parent="c_0" style="fillColor=#F1F1F1;strokeColor=#181818;" vertex="1">
            <mxGeometry height="2" width="4" x="188" y="41" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="" plantUmlId="ci_4" plantUmlBaseStyle="fillColor=#F1F1F1;strokeColor=#181818;" plantUmlBaseValue="" id="ci_4">
          <mxCell parent="c_0" style="fillColor=#F1F1F1;strokeColor=#181818;" vertex="1">
            <mxGeometry height="2" width="4" x="188" y="45" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="application" plantUmlId="c_5" plantUmlBaseStyle="rounded=1;absoluteArcSize=1;arcSize=5;fillColor=none;strokeColor=#181818;verticalAlign=top;align=center;spacingTop=2;fontSize=14;fontStyle=1;whiteSpace=wrap;" plantUmlBaseValue="application" id="c_5">
          <mxCell parent="plantuml-1" style="rounded=1;absoluteArcSize=1;arcSize=5;fillColor=none;strokeColor=#181818;verticalAlign=top;align=center;spacingTop=2;fontSize=14;fontStyle=1;whiteSpace=wrap;" vertex="1">
            <mxGeometry height="104.97" width="107" x="22.35" y="266.5" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="ports" plantUmlId="n_6" plantUmlBaseStyle="shape=folder;tabWidth=60;tabHeight=23;tabPosition=left;html=1;whiteSpace=wrap;fillColor=#F1F1F1;strokeColor=#181818;fontSize=14;align=left;verticalAlign=top;spacingLeft=6;spacingTop=1;" plantUmlBaseValue="ports" id="n_6">
          <mxCell parent="c_5" style="shape=folder;tabWidth=60;tabHeight=23;tabPosition=left;html=1;whiteSpace=wrap;fillColor=#F1F1F1;strokeColor=#181818;fontSize=14;align=left;verticalAlign=top;spacingLeft=6;spacingTop=1;" vertex="1">
            <mxGeometry height="40" width="77" x="15" y="34" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="domain" plantUmlId="n_7" plantUmlBaseStyle="shape=folder;tabWidth=72;tabHeight=23;tabPosition=left;html=1;whiteSpace=wrap;fillColor=#F1F1F1;strokeColor=#181818;fontSize=14;align=left;verticalAlign=top;spacingLeft=6;spacingTop=1;" plantUmlBaseValue="domain" id="n_7">
          <mxCell parent="plantuml-1" style="shape=folder;tabWidth=72;tabHeight=23;tabPosition=left;html=1;whiteSpace=wrap;fillColor=#F1F1F1;strokeColor=#181818;fontSize=14;align=left;verticalAlign=top;spacingLeft=6;spacingTop=1;" vertex="1">
            <mxGeometry height="40" width="89" x="82.81" y="416.22" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="infrastructure/svg" plantUmlId="n_8" plantUmlBaseStyle="shape=folder;tabWidth=151;tabHeight=23;tabPosition=left;html=1;whiteSpace=wrap;fillColor=#F1F1F1;strokeColor=#181818;fontSize=14;align=left;verticalAlign=top;spacingLeft=6;spacingTop=1;" plantUmlBaseValue="infrastructure/svg" id="n_8">
          <mxCell parent="plantuml-1" style="shape=folder;tabWidth=151;tabHeight=23;tabPosition=left;html=1;whiteSpace=wrap;fillColor=#F1F1F1;strokeColor=#181818;fontSize=14;align=left;verticalAlign=top;spacingLeft=6;spacingTop=1;" vertex="1">
            <mxGeometry height="40" width="168" x="143.39" y="164.75" as="geometry" />
          </mxCell>
        </UserObject>
        <UserObject label="requests / results" plantUmlId="e_9" plantUmlBaseStyle="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=1;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" plantUmlBaseValue="requests / results" id="e_9">
          <mxCell edge="1" parent="plantuml-1" source="c_0" style="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=1;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" target="c_5">
            <mxGeometry relative="1" as="geometry">
              <mxPoint x="60" y="11" as="offset" />
              <Array as="points">
                <mxPoint x="68.84" y="135" />
                <mxPoint x="-20.61" y="176.75" />
                <mxPoint x="54.45" y="235.39" />
              </Array>
              <mxPoint x="68.84" y="98.4" as="sourcePoint" />
              <mxPoint x="54.45" y="273.09" as="targetPoint" />
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="construction / injection" plantUmlId="e_10" plantUmlBaseStyle="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=0;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" plantUmlBaseValue="construction / injection" id="e_10">
          <mxCell edge="1" parent="plantuml-1" source="n_1" style="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=0;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" target="n_8">
            <mxGeometry relative="1" as="geometry">
              <mxPoint x="89" y="8" as="offset" />
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="receivers / model" plantUmlId="e_11" plantUmlBaseStyle="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=1;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" plantUmlBaseValue="receivers / model" id="e_11">
          <mxCell edge="1" parent="plantuml-1" source="c_5" style="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=1;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" target="n_7">
            <mxGeometry relative="1" as="geometry">
              <mxPoint x="39" y="-4" as="offset" />
              <Array as="points">
                <mxPoint x="-19.19" y="386.12" />
              </Array>
              <mxPoint x="54.45" y="360.76" as="sourcePoint" />
              <mxPoint x="105.06" y="416.22" as="targetPoint" />
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="document contract" plantUmlId="e_12" plantUmlBaseStyle="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=1;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" plantUmlBaseValue="document contract" id="e_12">
          <mxCell edge="1" parent="plantuml-1" source="n_6" style="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=1;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" target="n_7">
            <mxGeometry relative="1" as="geometry">
              <mxPoint x="90" y="14" as="offset" />
              <Array as="points">
                <mxPoint x="75.85" y="366.49" />
                <mxPoint x="127.31" y="386.12" />
              </Array>
              <mxPoint x="75.85" y="340.5" as="sourcePoint" />
              <mxPoint x="127.31" y="416.22" as="targetPoint" />
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="implements" plantUmlId="e_13" plantUmlBaseStyle="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=0;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" plantUmlBaseValue="implements" id="e_13">
          <mxCell edge="1" parent="plantuml-1" source="n_8" style="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=0;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" target="n_6">
            <mxGeometry relative="1" as="geometry">
              <mxPoint x="63" y="-17" as="offset" />
            </mxGeometry>
          </mxCell>
        </UserObject>
        <UserObject label="parse / serialize" plantUmlId="e_14" plantUmlBaseStyle="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=1;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" plantUmlBaseValue="parse / serialize" id="e_14">
          <mxCell edge="1" parent="plantuml-1" source="n_8" style="strokeColor=#181818;fontColor=#000000;fontSize=12;html=1;labelBackgroundColor=#FFFFFF;endArrow=classicThin;endFill=1;dashed=1;dashPattern=7 7;curved=1;rounded=0;endSize=6;sourcePerimeterSpacing=0;targetPerimeterSpacing=0;" target="n_7">
            <mxGeometry relative="1" as="geometry">
              <mxPoint x="53" y="-30" as="offset" />
              <Array as="points">
                <mxPoint x="254.1" y="235.39" />
                <mxPoint x="254.1" y="310.99" />
                <mxPoint x="273.81" y="391.36" />
              </Array>
              <mxPoint x="255.39" y="204.75" as="sourcePoint" />
              <mxPoint x="149.56" y="416.22" as="targetPoint" />
            </mxGeometry>
          </mxCell>
        </UserObject>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>

```

### 设计模式及具体角色

| 设计思想 | 采用方式与理由 |
|---|---|
| Command（必选） | Command 定义请求，EditCommand 定义可逆协议。ConcreteCommand 为 Create/Move/Scale/SetAttribute/Delete/Group/Ungroup/AddTo/Front/Back 及文档、查询、历史命令。CommandDispatcher/main 为 Client；CommandExecutor 为 Invoker；SvgNode、SvgDocument、SceneEditor、EditorSession、SceneQuery 等为业务 Receiver；Undo/Redo 命令以 CommandHistory 为 Receiver。请求与业务规则分离，编辑记录可进入历史。 |
| Composite | SvgNode 是共同 Component，五种图形为叶子，SvgGroup 为 Composite。容器把 move/scale 准备工作委托给孩子，叶子通过自身几何声明完成操作；set 保持统一接口及属性白名单，普通组样式按 SVG 继承。SvgDocument 是画布聚合根。 |
| Iterator 思想 | SvgNode/SvgDocument 实现前序 Iterable，查询、序列化和分组顺序复用受控遍历；外部只获得冻结的 children 快照，不依赖内部数组。 |
| Visitor | 本期不引入封闭的逐形状访问接口。统一几何/属性描述已满足显示与序列化；未来插件增加形状时，封闭 Visitor 会增加修改面。 |
| Observer | 本期只有顺序执行的 CLI，无多个实时视图，不建立事件总线。未来 GUI 可在 Session/Executor 的成功提交边界发布事件。 |
| Decorator | 没有动态叠加行为的当前需求，不引入装饰层。后续输出诊断、日志等若有实际需要再评估。 |

ShapeFactory 和 CommandDispatcher 是仅有的两处按名称选择实现的位置，均已标注待重构：未来可分别演进为 ShapeProvider 注册与命令注册。Reader 通过 ShapeFactory.fromAttributes 复用同一类型表；格式器按结果 DTO 和通用几何描述展示，不再次按图形 tag 分派。

### 树、事务与历史

- SvgNode 封装 ID、父级、归属、几何及样式；只读查询返回冻结快照。SvgDocument 统一检查 ID 唯一、父容器归属、重复挂接、环和有序位置。内部 Symbol 写入协议仅由 SvgDocument/SvgGroup/SvgNode 引用，属于包内约定。
- SceneEditor 处理跨父 group、ungroup、addto 和同级顺序；通过文档行为准备变更。group 先验证全部输入，再插入空组并转移成员；ungroup 提升孩子后删除空组，逆序恢复位置。
- ChangeSet 组合原子的 apply/revert 步骤；中途失败回滚已完成步骤，撤销失败也恢复已撤销步骤。单个步骤自身必须原子；本项目采用受控赋值与文档校验后的结构操作，不向插件开放任意回调。
- move/scale 保存受影响字段的旧/新值，避免反向浮点运算误差；set 保存单属性及缺席状态；结构操作保存相关节点身份、父级、索引。生产撤销不复制整个文档。
- CommandHistory 独占双栈及禁用标志。Executor 只在编辑成功后记账；Undo/Redo 先执行成功再移栈。每条成功编辑为一个单元，新编辑清空 Redo。查询与失败命令不改历史；成功 init/read/save/canvas 修改清空双栈并禁用，下一条成功编辑开启新历史。
- read 在候选文档中完成解析、ID 预留/补号和全部校验，再提交 Session；警告只在成功结果中发布。save 先完整序列化，再写同目录临时文件、fsync、关闭后 rename，失败保留会话和已有目标文件。

### 依赖方向规则

| 来源 | 允许依赖 | 理由 |
|---|---|---|
| domain | 本层模块及 TS 基础类型 | 图形/树规则可脱离 CLI、XML 和文件系统测试 |
| application | domain、本层命令/端口 | 用例依赖抽象保存/读取能力，不知道具体存储实现 |
| infrastructure/svg | domain、application/ports、Node I/O、saxes | 适配外部格式，不能反向调用 CLI 或具体命令 |
| cli | application、本层、Node readline/stream；main 可依赖 infrastructure | 保持输入输出与业务分离，把具体实现集中在装配根 |
| production | 不依赖 test | 测试只能依赖生产模块 |

`test/architecture/dependencies.test.ts` 守卫现有静态导入边界、内部结构符号和一类一文件规则；人工抽查再核对运行时控制流和名称分派。

### 已确认语义与变化点

图形尺寸/半径为有限非负数，画布宽高为正数；init 单参数只指定宽度，高度默认 600；canvas 修改必须同时给出宽高。scale 改变全部几何位置和尺寸，不改变 stroke-width 或文本。普通 g 的样式只写在组上，继承随父级改变；结构编辑保留几何和显式样式。

group 的新组使用首参数节点的原父级/位置，成员按修改前文档前序排列；同父摘除后校正位置。ungroup 禁止根级组，嵌套组的孩子占据原组位置。front/back 分别移到同级列表末尾/开头，末尾后绘制。

输入采用经用户确认的有限子集：UTF-8 XML 1.0、六类型及嵌套 g；根正数 width/height 可带 px，viewBox 可省略或必须匹配 `0 0 width height`；图形几何缺省 0。允许 SVG 命名空间/前缀、注释及 CDATA；transform、未知属性/元素、叶子子元素、DTD/处理指令明确失败。补 ID 前预留全部显式 ID；空 ID 视作缺失，按类型序号跳过冲突。

成功 read 记录绝对来源路径；无参数 save 使用该来源，显式 save 不更新来源；成功 init 清除来源，canvas 和编辑保留来源。没有来源时要求显式保存路径。计数含全部图形和 g，不含根 svg。

| 未来变化点 | 当前预留/不预留的决定 |
|---|---|
| 新图形及 box 插件 | 统一节点协议、唯一工厂表与结构化属性；不实现 ShapeProvider 加载器或 box，避免提前确定插件协议 |
| 新命令或其他入口 | Command/Executor 与 CLI 分离；唯一 Dispatcher 可演进为注册，不创建 GUI/网络服务 |
| XML 范围扩展或其他存储 | Read/Save 端口与 Reader/Writer 独立；完整 SVG/transform 支持须另行设计，当前明确失败 |
| 更多视图或日志 | 成功提交边界可作为事件接入点；无当前需求，不增加 Observer/Decorator |
| 历史策略 | 局部可逆记录和集中历史服务可扩展；不实现持久化历史或复杂分支时间线 |

## 过程记录

开发由用户与 Codex 结对进行，每阶段先检查、补测试、实现、验证，再由用户验收提交；以下保留各阶段发生的取舍与修正。

### M0 — 2026-10-17 — 工程骨架

- 授权范围：用户授权实施 M0，仅工程配置、最小 CLI 与 smoke test。
- 模块：`src/cli/SvgCli.ts` 封装输入输出生命周期；`main.ts` 只装配并启动。
- 架构取舍：Command/Composite 在后续指定里程碑落实；M0 不建立占位模型或历史机制。临时 help 判断在 M2 迁入唯一 CommandDispatcher。
- 工程选择：Node.js 24、TypeScript strict、ESM、tsx、Vitest；依赖由锁文件固定。
- 过程发现：PowerShell 阻止 npm.ps1，因此使用 npm.cmd；保留三份本地设计文档的 Git 忽略规则，阶段证据写入本文。
- 开发中发现并修复：首版在最后一行没有换行、直接 EOF 时，异步迭代拿到最后一行之前 readline 已关闭，再次 prompt 触发错误退出。保留对应回归测试，通过 close 事件跟踪关闭状态，关闭后不再 prompt。
- 测试环境：Windows PowerShell，Node.js v24.14.0、npm 11.9.0。npm 安装与 Vitest 启动最初受到沙箱缓存/子进程限制，获得权限后执行；未通过改动测试规避限制。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 为 1 个测试文件、4 个测试全部通过；`'help' | npm.cmd run cli` 与 `'help' | node dist/cli/main.js` 都显示提示符和帮助并正常退出；`git diff --check` 通过。
- 测试范围：空输入 EOF、CRLF 空行/整行注释、未实现命令报错后继续 help、无末尾换行的最后一行。尚未人工验证实体终端的 Ctrl+Z 按键行为。
- 架构符合性：仅 cli 模块引用 Node readline/stream；输入输出通过构造函数注入并封装。没有 domain/application/infrastructure 实现，没有 switch(tag)、any 或公共字段数据袋。Command/Composite 按计划留到后续阶段。
- 设计偏差：正式报告路径提前建立阶段记录草稿；未改动被忽略的设计基线，也未将待确认建议当作已批准决策。
- Git commit SHA：`020cc5a`（搭建运行环境）。
- 验收状态：用户已验收并提交，随后授权 M1。

### M1 — 2026-10-17 — 领域模型与 Composite

- 起点：M0 提交 `020cc5a`，工作区干净。
- 授权范围：六种内置图形模型、SvgDocument、ID 索引、完整父子约束与领域测试；不进入 M2。
- 用户确认：图形宽高/半径允许 0，画布宽高必须为正；所有几何数值有限。stroke-width 为有限非负数。
- 实现：SvgNode 为统一抽象；RectShape/CircleShape/EllipseShape/LineShape/TextShape 封装各自几何字段；SvgGroup 持有有序子节点；SvgDocument 管理根、索引和整体归属。
- Composite/Iterator：叶子和组都提供只读 children、getGeometry/getAttributes 和前序 Iterable；叶子没有孩子。领域对象不生成 CLI 文本或 XML。
- 树结构规则：append/insert 只接收未归属的子树根，父容器必须属于当前文档；拒绝重复 ID、重复归属、环和非法插入位置；先验证整棵子树，成功后统一写入。remove 注销全部子孙 ID，保留摘除子树内部的父子关系和对象身份，重新插入后完整恢复登记。
- 封装决策：字段采用 ECMAScript 私有字段；对外属性和 children 为冻结快照。TypeScript 没有包级 friend，internal/TreeAccess.ts 用 Symbol 提供聚合内部结构写入协议，仅 SvgDocument 调用，应用/CLI 禁止导入；该协议属于包内约定，不是防恶意调用的安全边界。
- 初始方案复核：样式参数采用结构类型，额外 x 字段可能覆盖查询结果中的几何属性，因此构造时拒绝三种公共样式以外的字段，并增加回归测试。
- 阶段边界说明：架构中的几何接口本轮落实为多态只读查询；move/scale/set 的变更行为按 M3 计划实现，未添加空方法或“尚未实现”异常占位。树结构仅提供聚合基础操作，未实现 group/ungroup/addto/front/back 用例或 Command/History。
- 目录细化：增加 SvgAttributes.ts 类型文件和 internal/TreeAccess.ts，仍位于 domain 内；未修改 CLI、依赖或工程配置。
- 测试过程：先写两份领域测试，在授权的沙箱外运行中因缺失模型模块失败；实现后首轮完整回归 42/42 通过，随后针对样式覆盖和嵌套容器恢复补充测试。
- 最终证据：`npm.cmd run build` 通过；`npm.cmd test` 为 3 个文件、44 项全部通过（40 项领域测试 + 4 项 M0 CLI 回归）；Node 直接加载 dist/domain 编译产物，执行嵌套创建、遍历、子树摘除和重新插入的 smoke check 通过；`git diff --check` 通过。
- 依赖复核：domain 只导入本层模块；SvgNode 对 SvgDocument/SvgGroup 的引用为 type-only，避免运行时循环；没有 Node I/O、CLI/XML、switch(tag) 或 any。
- Git commit SHA：`4c6aea4`（建立领域模型，设置统一 Node 抽象，实现六种内置图形模型）。
- 验收状态：用户已验收并提交，随后授权 M2。

### M2 — 2026-10-17 — 命令入口与基础查询

- 起点：M1 已由用户验收，提交 `4c6aea4`，工作区干净。
- 本轮范围：Tokenizer/Dispatcher、基础 Command/Executor/Session、六类型 create（含 in）、init、canvas、tree/show/help；不进入 M3。
- 用户确认补充：本轮补入 canvas 尺寸修改；canvas 无参数查询，两个参数修改，单参数报语法错误。init 一个参数指定宽度且高度为 600，无参数为 800×600。
- 分派约束：CommandDispatcher 对命令名、ShapeFactory 对类型名；均标记为未来重构点。格式器只解释结果和通用几何描述，不按图形标签再次分派。
- 设计细化：领域新增与 CLI 无关的点/线段/属性集合几何描述；独立 CLI 格式器输出 tree/show。CreateCommand 保存原节点、文档、父容器及插入位置并提供 undo/redo 协议，本轮不建立历史栈或启用 undo/redo 命令。
- 角色对应：Command/EditCommand 为请求协议；六个具体命令为 ConcreteCommand；Dispatcher 与 main 为 Client；CommandExecutor 为 Invoker；EditorSession、SvgDocument 和 SceneQuery 为 Receiver。命令不直接读写节点字段。
- 解析规则：只把整行起始的 # 作为注释；双引号保留空文本和引号元数据；引号内支持转义引号/反斜杠，其他反斜杠原样保留。只有未加引号的尾部 in 被识别为父容器子句。数值统一使用有限十进制/指数解析。
- 测试过程：先确认缺失模块与未实现会话导致的失败基线，再实现；首轮 64 项通过，针对小数/指数、文本转义和多根连接线补测后最终 6 个文件、66 项全部通过。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 66/66 通过；`node dist/cli/main.js` 会话验证创建、tree/show、canvas 修改及 box 错误；UTF-8 管道下中文往返通过；`git diff --check` 通过。Vitest 按既有环境要求在授权的沙箱外执行。
- 初始方案复核：SceneQuery 的父引用联合类型采用结构收窄，避免不安全强转；帮助结果只复制 syntax/description，避免把 Dispatcher 的构造回调带入结果快照。M0 smoke test 保留启动/注释/错误恢复/EOF 检查，随现有支持范围更新断言。
- 依赖审核：domain 仅依赖本层，application 依赖 domain，CLI 仅依赖 application 和本层；应用/CLI 不导入内部 TreeAccess。没有 switch(tag) 或新增形状类型分派。ResultFormatter 的结果联合类型分支只负责展示结果，不构造或路由命令。
- 变更范围：新增应用层、Tokenizer/Dispatcher/格式器、ShapeFactory/SvgNumber 和三份测试；扩展模型查询/画布基础能力，更新现有 CLI 与 smoke test、README。未新增依赖、历史栈、文件读写或后续编辑命令。
- 文档同步：按用户确认更新本地 ARCHITECTURE/DEVELOPMENT_PLAN/CODEX_PROMPT，保留三文件原有 Git 忽略规则；关键决定在本文中受版本控制。
- Git commit SHA：`7bf0221`（M2 命令入口）。
- 验收状态：用户已验收并提交，随后授权 M3。

### M3 — 2026-10-17 — 基础编辑与失败原子性

- 起点：M2 提交 `7bf0221`，工作区干净；只实施 M3。
- 用户确认：普通 g 的 fill/stroke/stroke-width 仅写在组上，按 SVG 继承，不覆盖孩子的显式样式；scale 只改变几何位置与尺寸，不改变 stroke-width 或文本内容。
- 实现范围：新增 MoveCommand、ScaleCommand、SetAttributeCommand、DeleteCommand；NodeEditCommand 封装共同执行/撤销/重做状态；接入既有 Dispatcher、Executor 和 CLI 格式器。
- 领域重构：GeometryState 为封装的几何值对象，形状类声明本类型的坐标轴及非负尺寸字段；统一数值校验与字段局部变更，避免五类叶子重复实现。SvgGroup 以 Composite 委托子节点准备变更，不根据 tag 分派。
- 原子性：先准备并校验全部子孙的改动，再应用 ChangeSet。每个步骤本身原子；若后续步骤失败，回滚已完成步骤。revert 失败也回滚已撤销步骤，记录保持可重试。当前领域写入步骤为受控赋值或已预校验的树操作。
- 撤销记录：move/scale 保存受影响字段的旧/新值，不依赖减位移或乘倒数；set 只保存单属性旧值/缺席状态；delete 保存同一节点/子树、父容器和原插入索引。不复制整份文档。
- 复核修正：初版样式记录捕获整个样式对象，改为单属性旧值，防止还原 fill 时覆盖其他样式。新增样式独立记录、组继承和命令重复调用状态回归。
- 测试过程：新增三个测试文件先验证失败基线；首轮实现 93/93 通过，复核补测后最终 9 个文件、95/95 通过（新增 29 项）。
- 实际执行：`npm.cmd run build` 通过；`npm.cmd test` 95/95 通过；UTF-8 管道运行 `node dist/cli/main.js`，中文 set、组 move/scale、tree、整组 delete 及删除后子孙不可寻址均符合预期；`git diff --check` 通过。Vitest 使用已授权的沙箱外运行权限。
- 依赖审核：domain 仅依赖本层；application 通过领域行为修改模型；CLI 只构建请求与显示结构化结果。两处名称分派仍为 Dispatcher/ShapeFactory；未向应用或 CLI 暴露 TreeAccess，也未引入 any。
- 变更范围：两个领域类、五个命令层类、三份测试；更新领域几何封装、Dispatcher/结果协议、帮助阶段标记和项目说明。没有新增依赖，没有实现 M4 的分组重排或 M5 历史栈。
- 文档偏差：增加 GeometryState、ChangeSet 和 NodeEditCommand，已记录理由并同步本地架构/提示文档；保留这些本地文件既有忽略规则。
- Git commit SHA：`687818c`（新增 move、scale、set、delete 命令）。
- 验收状态：用户已验收并提交，随后授权 M4。

### M4 — 2026-10-17 — 层级与顺序

- 起点：M3 已验收并提交为 `687818c`，工作区干净。
- 用户确认：group 新组置于首参数节点的原父级/原位置，成员按修改前文档前序排列。同父选中节点被摘除后自然校正插入位置。例如 A=[a,b]、B=[c,d]，group g c a 得到 A=[b]、B=[g,d]、g=[a,c]。
- 用户确认：group/ungroup/addto 仅改变树结构，不改几何和显式样式；继承随新父级变化，解组带样式的容器可能改变子节点外观。
- 实施范围：SceneEditor、五类结构命令、文档内受控转移、局部事务记录与测试；不实现历史栈或 SVG I/O。
- 测试先行：新增领域、应用、CLI 三份测试并确认缺失模块/命令导致的失败基线。
- 实现：SceneEditor 负责多节点结构规则；SvgDocument.planRelocate 原子更新父引用/有序列表，文档内转移不注销子树 ID；五个具体命令封装请求并保存局部 ChangeSet。
- 事务策略：group 预校验全部 ID、重复参数和祖先冲突，再插入空组并按原顺序转移；ungroup 先依次提升孩子，再删除空组。每次转移捕获该步骤执行前的父级/索引，逆序恢复；中途失败由既有 ChangeSet 回滚。记录只保存相关对象及局部位置，不复制文档。
- 复核修正：除 TypeScript 类型约束外，转移入口增加运行时容器检查，避免动态调用传入叶子后发生部分摘除。测试快照显式记录 parentId/childIds，避免私有字段对象的深比较掩盖结构差异。
- 测试过程：先确认三个新增测试文件的失败基线；首轮 115 项通过，补测非空根子树、动态非法目标、撤销中途失败及重试后，最终 12 个测试文件、117/117 通过（本轮新增 22 项）。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 117/117 通过；UTF-8 管道运行 `node dist/cli/main.js`，验证跨父 group g c a、中文文本、ungroup、addto 和 front 的树输出；`git diff --check` 通过。Vitest 仍使用授权的沙箱外子进程权限。
- 依赖检查：SceneEditor 只依赖 domain；具体命令仅调用领域服务；CLI 无 domain 直接依赖，TreeAccess 未暴露给服务外层。两处名称分派维持 Dispatcher/ShapeFactory；没有新增形状类型分派、Node I/O 反向依赖或公共数据袋。
- 变更概览：新增 SceneEditor、五个命令和三份测试；更新 SvgDocument、命令结果、Dispatcher/格式器、两份现有测试的帮助阶段标记，以及 README/本记录。未新增依赖，未引入历史栈或后续 I/O。
- 文档同步：将已确认的跨父分组和原生结构语义写入本地架构/计划/提示文档；保留三份文件的 Git 忽略规则，关键决策在本文受版本控制。
- Git commit SHA：`ef7673c`（实现 group、ungroup、addto、front、back 命令）。
- 验收状态：用户已验收并提交，随后授权 M5。

### M5 — 2026-10-17 — Undo/Redo 与历史边界

- 起点：M4 提交 `ef7673c`，工作区干净；只实施 M5。
- 用户确认：成功 init、canvas 修改（以及后续 read/save）清空双栈并禁用 undo/redo，下一条成功编辑开启新历史。查询及失败命令保留历史和禁用状态。
- 实现：CommandHistory 封装双栈与禁用标志；UndoCommand/RedoCommand 调用历史并返回原命令的结果；CommandExecutor 成功执行编辑后才入栈，成功执行文档命令后才设边界。main 创建唯一历史实例，显式注入 Executor 和 Dispatcher。
- 架构细化（ADR-009）：草案曾把历史状态同时分配给 Session 与 History，现由 History 独占，避免状态不同步。Command.kind 增加 history，撤销/重做不会再次入栈。未改变 domain，也未增加图形或命令名分派点。Visitor/Observer/Decorator 仍无本轮必要场景。
- 原子性与记录：沿用 M2～M4 的节点身份、局部属性旧/新值、原父级/索引和 ChangeSet；没有生产用全量文档快照。历史先完成 undo/redo，再移动栈项；异常保留两栈，允许修复外部冲突后重试。每条成功编辑均为一个单元，包含无效果的合法编辑；新的成功编辑清空 Redo。
- 错误约定：历史禁用时 undo 和 redo 均使用原需求的 `undo not allowed after io command`；未初始化时沿用 no document；未禁用且空栈时分别为 `nothing to undo` / `nothing to redo`。
- 测试先行：新增历史测试，确认 CommandHistory 模块缺失导致失败基线。首轮完整运行 127/128 通过，唯一失败为新增测试误写既有 box 错误文案；核对原需求后修正断言，保留生产错误文本。
- 回归证据：所有十类编辑逐前缀反向撤销、正向重做，检查精确属性、节点身份、父引用、兄弟顺序及 ID 索引；覆盖六种形状、跨父 group、嵌套子树 delete/restore、属性缺席、小数恢复。另有游标时间线状态机、失败与查询保留 Redo、分叉、文档边界、空栈、真实 undo/redo 失败重试、复合撤销中途失败回滚与重试。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 最终 14 个文件、130/130 通过（本轮新增 13 项）；UTF-8 管道回放 `node dist/cli/main.js`，圆形 100→130→100→130、中文文本撤销、整组删除恢复及 group 撤销后的原父级输出均通过；`git diff --check` 通过。Vitest 使用授权的沙箱外子进程权限。
- 依赖检查：domain 无 application/CLI/Node I/O 反向依赖；CLI 不直接导入 domain；TreeAccess 未泄漏到应用层。CommandHistory 只管理请求历史，业务仍由领域对象/服务完成。
- 变更范围：新增三个应用类及两份测试；更新执行器、命令分类、入口装配、Dispatcher/help、现有三份测试与 README/本记录。没有依赖变更或 SVG 文件读写。
- 文档同步：本地架构/计划/提示文档记录 ADR-009 和确认的历史规则，保留原 Git 忽略规则；关键决定在本文受版本控制。
- Git commit SHA：`4774476`（接入 undo/redo 双栈）。
- 验收状态：用户已验收并提交，随后授权 M6。

### M6 — 2026-10-17 — SVG 保存

- 起点：M5 提交 `4774476`，工作区干净；只实施 M6，不实现 read。
- 用户确认：无参数 save 只回到成功 read 的来源路径，显式 save 不更新默认路径；相对路径按进程工作目录解析。本阶段没有 read，需显式指定目标，默认来源状态留到 M7。
- 用户确认：提示计数包含全部图形/g，排除根 svg。复核修正此前 AI 的误计：§6.1 实际有 3 个 g、2 个 rect、2 个 text、1 个 line，共 8 个；原示例没有计数错误。已纠正本记录的待确认项。
- 实现及职责：应用层 SvgSavePort 定义保存接口；SaveCommand 只执行用例、校验前提并映射标准文件错误；SvgWriter 纯序列化；AtomicFileWriter 处理文件替换；SvgFileStore 组合两者，main 装配注入。保留同步 Command 契约，无新增依赖。
- 序列化：通过文档 Iterable、节点公开属性和父引用输出所有六种形状及嵌套组，祖先栈避免递归栈溢出；无按 tag 的新增分派。输出 XML 声明、namespace、width/height/viewBox、有序元素、text 子文本和显式样式，缺席样式不补默认值。转义特殊字符，处理 XML 属性空白规范化，非法字符/孤立代理项明确失败，不静默替换。
- 文件保护：完整序列化后才创建同目录唯一临时文件，wx 写入 UTF-8、fsync、关闭后 rename 替换；失败时尽力清理，不先截断原文件。不自动创建缺失目录；不承诺进程崩溃或断电后的清理。
- 历史边界：SaveCommand 分类为 document，沿用 Executor 成功后清空并禁用历史。保存失败不改变文档/历史；无默认路径、序列化失败和真实文件写入失败均测试保留 Redo。成功保存不修改任何默认路径状态。
- 测试先行：先新增 SvgWriter 测试并确认缺失模块失败基线；序列化/原子写入首轮 15/15 通过。接入 SaveCommand 后完整 151/151 通过，补入讲义示例回放后最终 18 个文件、152/152 通过（本轮新增 22 项）。
- 测试覆盖：全部六类型、嵌套顺序、空画布/空文本、缺席样式、中文/Emoji/特殊字符、非法 XML 字符、1500 层分组；Windows 真实覆盖、部分写入与 rename 失败的旧文件保护及临时文件清理；相对/绝对/空格/中文路径、缺失路径、保存边界、失败保留两栈；讲义 8 元素示例。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 152/152 通过；编译后 CLI 回放 examples/demo.cli 生成 demo.svg，提示 8 elements；独立 .NET XML 解析核对 namespace、viewBox、节点数及中文。隐藏无头 Chrome 实际渲染并检查截图，两个彩色节点、连线和中文布局符合讲义；`git diff --check` 及新增文件空白检查通过。Vitest 和浏览器使用已授权的沙箱外执行权限。
- 依赖复核（ADR-010）：domain 未修改，无反向 I/O 依赖；应用仅依赖保存端口，具体基础设施仅在 main 引用；内部 TreeAccess 未暴露，名称分派仍集中于 Dispatcher/ShapeFactory。Visitor/Observer/Decorator 未引入。
- 变更范围：新增五份生产文件（一个接口、四个类）、四份测试、demo.svg 及 examples/demo.cli；更新结果协议、命令装配/分发/格式器、现有测试帮助标记、README 与本记录。未安装依赖，未实现 SVG 读取、来源路径替换、transform 导入或 M7 功能。
- 文档同步：本地架构/计划/提示文档记录已确认路径、计数与 ADR-010，保留原有 Git 忽略规则；关键决策由本文跟踪。
- Git commit SHA：`c7d4b04`（实现 save <file.svg> 命令）。
- 验收状态：用户已验收并提交，随后授权 M7。

### M7 — 2026-10-17 — SVG 读取与来源路径

- 起点：M6 提交 `c7d4b04`，工作区干净；只实施 M7。
- 用户确认输入范围：六类型及嵌套 g；transform、未知元素/属性（含 style/font-size/data-*）、叶子中的子元素整次失败。允许 XML 声明、注释、CDATA、SVG 命名空间；拒绝 DTD。根 width/height 必须为正，可带 px；viewBox 可缺省，存在时必须匹配 0 0 width height。图形几何缺省 0；空 ID 视作缺失，先预留所有显式 ID，再按前序和每类型序号补 ID。
- 具体适配边界：UTF-8 XML 1.0，可接受 BOM；根只接收 width/height/viewBox 与命名空间声明，接受 SVG 前缀或无命名空间文件。外来命名空间、不支持的处理指令和非 UTF-8 明确失败。读写往返保留模型语义，格式与命名空间前缀会规范化。
- 用户批准依赖：新增固定运行时 saxes@6.0.0（带入 xmlchars）；沙箱内安装遇到 ENOTCACHED，使用获批网络权限完成安装。XML 库仅出现在基础设施层。
- 编译兼容修正：首次 build 报错全部来自 saxes 声明，涉及 TS7 泛型约束与 exactOptionalPropertyTypes。提出方案后，用户明确批准 skipLibCheck:true；源码 strict/exactOptionalPropertyTypes/noUncheckedIndexedAccess 及调用处类型检查继续开启。未更改 node_modules 声明或降低源码严格性。
- 实现职责（ADR-011）：SvgReader 解析为前序输入记录，完成根/命名空间检查、显式 ID 预留和候选树构建。ShapeFactory 在原唯一类型表中补充几何元数据，提供通用 fromAttributes，使 CLI 和读取复用类型创建/校验，不增加标签分派。SvgFileStore 负责读取字节、UTF-8 解码及绝对路径；SvgReadPort 返回候选文档/警告/来源。ReadCommand 完整成功后调用 EditorSession.load；Executor 随后触发历史边界。
- 原子性：失败候选不触及当前文档、路径、双栈；候选警告只在成功结果中发布。重复 ID 保持原需求的 id already exists 文案，文件读取失败保持 cannot read file，XML 语法错误带 invalid SVG 诊断。
- 来源生命周期：成功 read 替换为绝对路径，成功 init 清空；失败 read/init 保留。编辑、canvas 修改及显式 save 保留来源；无参数 save 回到来源，新的成功 read 更新默认目标。读入文档继续支持同一组编辑与 Undo/Redo，无单独的导入节点类型。
- 测试先行：新增 Reader 测试确认模块缺失失败基线；首轮 Reader 36/36 通过。首次完整回归 200/201 通过，唯一失败为新增测试漏算对同一缺 ID 原文件再次读取的警告；修正断言，并验证保存后的副本不再补号。补入编码/命名空间边界后最终 22 个文件、204/204 通过（本轮新增 52 项）。
- 覆盖：全文后置显式 ID、空 ID、大小写、七元素原需求 fixture、六类型/嵌套/样式/文本往返、CDATA/实体、XML 错误、DTD、未知内容、非法几何、px/viewBox、命名空间、XML 版本、无效 UTF-8、默认来源与复制保存、失败后继续 Undo/Redo、替换成功后的历史清理。
- 实际验证：`npm.cmd run build` 通过；`npm.cmd test` 204/204 通过；编译后 CLI 在 dist/m7-verification 内回放原需求 other.svg，读取→编辑→撤销/重做→无参数保存→重新读取→整组删除恢复→另存→再读取均通过；独立 .NET XML 解析核对 7 元素与几何值，保存后不再告警。`git diff --check` 和新增文件空白检查通过。Vitest 使用授权的沙箱外子进程权限。
- 依赖复核：domain 不依赖 XML/fs/application；基础设施依赖领域及端口；CLI 仅装配入口引用具体基础设施。ShapeFactory 仍为唯一图形类型注册表，Dispatcher 为唯一命令名称分派；未引入 Visitor/Observer/Decorator 或插件。
- 变更范围：新增 SvgReadPort、ReadCommand、SvgReader、四份测试及原需求 fixture；扩展 Session/SaveCommand/FileStore/Factory、结果和 CLI 装配契约；更新 package/lock、获准的 tsconfig 兼容选项、既有帮助测试和说明。未修改 demo.svg，未实施 M8 总验收/正式报告。
- 文档同步：本地架构/计划/提示文档记录输入规则和 ADR-011，保留原有 Git 忽略规则；关键决策在本文跟踪。
- Git commit SHA：`5e70d51`（实现 read <file.svg> 接口）。
- 验收状态：用户已验收并提交，随后授权 M8。

### M8 — 2026-10-17 — 综合验收与正式报告

- 起点：M7 提交 `5e70d51`，工作区干净；范围为精确完整会话、架构守卫和本正式报告，无新产品功能。
- 新增三份完整会话输出基线：原需求 §6 典型会话、覆盖六类型和结构/顺序操作的往返会话、§6.1 流程图。基线独立编写，测试只规范换行、移除提示符和首尾空白，保留树连接线、属性与错误全文。
- 初轮会话 3/4 通过；帮助测试把 EOF 说明误当命令，修正为识别小写命令名称并单独断言 EOF 说明，生产代码未修改。
- 新增六项架构检查：domain、application、CLI 装配边界、基础设施端口依赖、内部 TreeAccess、类名/文件名。结合人工审查未发现本轮需修改的生产实现。
- 最终验证：`npm.cmd run build` 通过；`npm.cmd test` 为 24 个文件、214/214 通过（新增 10 项）。三份会话用编译后的 `node dist/cli/main.js` 在隔离目录重新精确比对 stdout/stderr，全部通过。独立 .NET XML 解析确认流程图 8 元素及中文；无头 Chrome 实际渲染截图，人工检查两彩色节点、连线和中文布局正常。
- 文档完成：本文补齐四个规定部分与 PlantUML 包图、设计模式角色、变化点、完整命令证据矩阵、限制及交付状态；保留 M0～M7 的过程证据。
- Git 检查：起点分支 master，本地 origin/master 引用显示领先 9 次提交，final 标签不存在；未联网核验远端。没有执行提交、推送或创建标签。
- 变更范围：两份测试文件、六份会话/输出 fixture，以及根 README/本文；三份本地设计文件同步但继续保持 Git 忽略。无源码、依赖或编译配置变更。
- Git commit SHA：待用户验收后提交。
- 验收状态：本地验证通过，待用户验收及完成最终 Git 手续。

## 一致性自查

### 模块划分是否一致

实际保留了 cli/application/domain/infrastructure 四层。随迭代新增 GeometryState、ChangeSet、NodeEditCommand、application/ports、SvgFileStore、AtomicFileWriter 及 domain/internal，均已在 M1/M3/M6/M7 记录原因；这些是对职责的细化。Session 曾被草案分配历史标志，M5 调整为 History 独占，已记 ADR-009。M7 新增语义属性恢复入口复用唯一工厂，已记 ADR-011。

所有导出的生产类各占一个同名文件，接口和结果类型可独立成文件；main 是装配脚本。图形拥有行为及私有状态，公开结构化 DTO/冻结快照用于边界传值。未实现 box、GUI、HTTP、完整 SVG 或强行引入额外模式。

### 依赖方向是否一致

静态守卫与人工抽查均未发现反向依赖：domain 只引用本层；application 引用领域及本层端口；SvgFileStore 实现端口；只有 main 装配具体基础设施。TreeAccess 仅由三个聚合内部类引用。项目唯一 switch 位于 ResultFormatter，分支依据结果联合类型，未按图形 tag 或命令名称分派。

名称分派仍集中在 Dispatcher 与 ShapeFactory 两张表。Reader 的类型恢复使用 Factory；XML 标签字符串只用于解析根/命名空间与输出，不建立另一份形状构造表。CommandHistory 管理双栈，ChangeSet 管理局部事务，SvgDocument 管理树/索引，各自承担独立责任。

### 限制和已知取舍

- 输入仅支持已确认的 SVG 子集；背景知识中的 transform 示例会明确拒绝。样式继承随结构改变，解组不保证外观不变。
- 读写保留模型语义，XML 声明、注释、前缀和格式会规范化；没有实现完整 SVG 保真编辑。
- 文件 I/O 同步执行，适合本期顺序 CLI。临时文件替换在当前 Windows 环境实测；未承诺断电/进程崩溃后的清理或其他平台文件替换行为。
- skipLibCheck 经用户确认用于 saxes 与 TS7 声明兼容，跳过声明文件内部检查；源码严格检查继续开启。内部结构符号按模块约定隔离，不是防恶意调用机制。
- 未测量行/分支覆盖率，测试通过数不等同于穷尽证明。未人工操作实体终端 Ctrl+Z；真实 Node 子进程 EOF/无末尾换行退出已覆盖。

## 质量保证手段

### 需求到实现及测试的对应

下表测试列省略 `test/` 前缀和 `.test.ts` 后缀；原有分层测试补充精确会话无法观察的对象身份、索引、缺席属性和失败重试。

| 需求 | 实现位置 | 主要测试证据 |
|---|---|---|
| init 默认/单参数/失败原子性 | InitCommand、EditorSession | application/commands、ReadCommand；integration/cli.m2、cli.acceptance |
| canvas 查询/修改/历史边界 | CanvasCommand、SvgDocument | application/commands、CommandHistory；integration/cli.m2、cli.acceptance |
| 六类型 create、in、ID 唯一 | ShapeFactory、CreateCommand、SvgDocument | domain/shapes、SvgDocument；integration/cli.m2、cli.acceptance |
| move | MoveCommand、SvgNode/GeometryState/SvgGroup | domain/edits；application/edits、CommandHistory；典型会话精确输出 |
| scale | ScaleCommand、几何值对象/Composite | domain/edits；application/edits；六类型结构会话 |
| set 白名单/继承/文本 | SetAttributeCommand、节点多态 | domain/edits；application/edits；integration/cli.m3、cli.acceptance |
| delete 整棵子树 | DeleteCommand、SvgDocument | domain/SvgDocument；application/CommandHistory；integration/cli.m5、cli.acceptance |
| group 跨父/顺序/原子性 | GroupCommand、SceneEditor | domain/SceneEditor；application/structure、CommandHistory；典型会话 |
| ungroup 根级限制/提升 | UngroupCommand、SceneEditor | domain/SceneEditor；application/structure；integration/cli.m4、cli.acceptance |
| addto 防循环/末尾挂接 | AddToCommand、SvgDocument.planRelocate | domain/SceneEditor；application/structure；结构会话 |
| front/back 同级顺序 | FrontCommand/BackCommand、SceneEditor | domain/SceneEditor；application/structure；结构会话 |
| tree 全文/子树内联属性 | SceneQuery、NodeFormatter | integration/cli.m2、cli.m4、cli.acceptance |
| show parent/属性 | SceneQuery、NodeFormatter | integration/cli.m2、cli.m7、cli.acceptance |
| help 全命令及 EOF | HelpCommand、Dispatcher、格式器 | integration/cli.smoke、cli.acceptance（19 个名称） |
| undo/redo 粒度/分叉/失败 | CommandExecutor、CommandHistory、ChangeSet | application/CommandHistory（全部编辑逐前缀、时间线、失败重试）；integration/cli.m5 |
| save 转义/旧文件保护 | SaveCommand、SvgWriter、AtomicFileWriter | infrastructure/SvgWriter、AtomicFileWriter；application/SaveCommand；integration/cli.m6 |
| read 补 ID/失败候选/来源 | ReadCommand、SvgReader、SvgFileStore、Session | infrastructure/SvgReader、SvgFileStore；application/ReadCommand；integration/cli.m7 |
| read/save/read 等价 | Reader/Writer、文件适配器 | infrastructure/SvgReader、SvgFileStore；integration/cli.m7、cli.acceptance |
| 引号/空文本/注释/错误恢复 | Tokenizer、SvgCli | cli/CommandTokenizer；integration/cli.smoke、cli.m2 |
| 精确标准错误及阶段范围 | 接收者/Executor/格式器 | integration/cli.m2～m7、cli.acceptance；box 明确 unknown shape type |
| 结构、依赖与类组织 | 聚合、端口与装配根 | domain/SvgDocument、SceneEditor；architecture/dependencies |

### 验证方法与实际结果

环境：Windows PowerShell，Node v24.14.0、npm 11.9.0。依赖由 package-lock.json 固定。实际执行：

```powershell
npm.cmd run build
npm.cmd test
git diff --check
```

构建通过；24 个测试文件、214 项测试全部通过。测试包括领域单元、命令/历史状态机、真实文件失败注入、XML 往返、真实 CLI 子进程、三份精确完整会话及架构守卫。Vitest 因环境子进程限制使用用户授权的沙箱外执行权限。

编译产物另外用三份脚本回放并比较输出，隔离产物位于被忽略的 dist/m8-verification，不污染示例或测试 fixture。采用独立 .NET XML 解析器检查流程图，并用独立 Chrome 配置无头渲染后查看截图。交付的 [demo.svg](../demo.svg) 与 examples/demo.cli 生成结果一致，浏览器可直接打开。

复现单项验收：

```powershell
npm.cmd test -- test/integration/cli.acceptance.test.ts test/architecture/dependencies.test.ts
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Encoding UTF8 examples/demo.cli | node dist/cli/main.js
```

### Git 演化与最终交付状态

| 阶段 | 已存在提交 | 当时通过测试数 |
|---|---|---|
| M0 | 020cc5a | 4 |
| M1 | 4c6aea4 | 44 |
| M2 | 7bf0221 | 66 |
| M3 | 687818c | 95 |
| M4 | ef7673c | 117 |
| M5 | 4774476 | 130 |
| M6 | c7d4b04 | 152 |
| M7 | 5e70d51 | 204 |
| M8 | 待用户验收提交 | 214 |

本地已有分阶段提交，M8 没有自动提交。检查时分支为 master，已配置 origin，本地 origin/master 引用显示领先 9 次提交；没有联网核验远端最新状态，final 标签尚不存在。

用户需审阅本轮 diff 并验收，提交 M8 后确认提交 SHA、实际截止时间、远端和分支，推送提交并在最终提交创建/推送 final 标签；已有同名标签时先核查，不能强制覆盖。完成这些手续后再核对远端 final 是否指向已验证的最终提交。本轮未执行任何提交、推送或标签创建，不将本地测试通过写成远端交付完成。
