# Phase 2 开发入口

更新日期：2026-11-17。状态：**P2-4 已整合提交1d1b646；P2-5 modified-star与双标签开发/本地验收完成，399项测试通过，当前变更待审阅提交；下一阶段为P2-6。**

本目录是后续分阶段开发的工作依据。用户已确认采用首轮评审的建议设计；不再重复询问已经采纳的取舍。首次分析保留在 [PHASE_2_REVIEW.md](../PHASE_2_REVIEW.md)，其中“无 final 标签”“建议待定”等描述是首次检查时的历史状态，以本目录的最新记录为准。

## 阅读顺序

| 文档 | 用途 |
|---|---|
| [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) | 已采纳的架构/行为决策，以及本轮补齐的工程约定 |
| [ENVIRONMENT.md](ENVIRONMENT.md) | 实测环境、final 核对、拟增加依赖、环境准备与限制 |
| [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) | 各阶段范围、前置、变更边界、验证、交付与提交节点 |
| [ACCEPTANCE.md](ACCEPTANCE.md) | 需求到阶段/测试/证据的映射，以及双装配和 Git 差异规则 |
| [P2-0_REPORT.md](P2-0_REPORT.md) | 扩展骨架、真实宿主和 final 原始字节验证的执行记录 |
| [P2-1a_REPORT.md](P2-1a_REPORT.md) | SVG 标记、刷新/异常测试、大纲观察与真实截图 |
| [P2-1b_REPORT.md](P2-1b_REPORT.md) | SVG 大纲、源码定位/更新/恢复、VSIX 安装与 A.3 分析 |
| [P2-2a_REPORT.md](P2-2a_REPORT.md) | core/host/内置包迁移、扩展契约、独立测试及字节兼容 |
| [P2-2b_REPORT.md](P2-2b_REPORT.md) | 受控事务、失败原子性、复合策略、SVG 恢复、生命周期和 ADR |
| [P2-2c_REPORT.md](P2-2c_REPORT.md) | 安装回滚、ESM 配置加载、DirectoryPort、A/B/差异/指标与冻结说明 |
| [P2-3a_REPORT.md](P2-3a_REPORT.md) | stats 独立包、准确统计/顺序、单包测试、真实 A/B 及工作区接入边界 |
| [P2-3b_REPORT.md](P2-3b_REPORT.md) | dir 独立包、目录 Adapter 角色、真实目录/无副作用、两命令启禁用和联合回放 |
| [P2-4_BASELINE_PREPARATION.md](P2-4_BASELINE_PREPARATION.md) | 一致根配置、无扩展测试入口、F 候选验收和后续 C_A/C_B 规则 |
| [P2-4_REPORT.md](P2-4_REPORT.md) | box/属性/类型标签、真实共同父提交 A/B、365项测试、字节回放和历史指标 |
| [P2-5_REPORT.md](P2-5_REPORT.md) | modified-star内容状态机、双标签/失败IO/资源释放、399项测试和A/B字节回放 |

需求依据：[Phase 2](../phase_cli_2.md)、[Phase 1](../phase_cli_1.md)。需求原文约束产品语义；本目录细化执行，不扩大选做任务。旧的 Phase 1 开发提示词不再用来禁止本阶段的插件与 box，但其封装、回归和提交审阅原则继续保留。

## 已确定的起点

- 本地附注标签 `final` 已核对正确，指向 `2054ec5667ad2e5f16b9b52ddd75a3435ed63c9d`。
- 本轮开始时工作区干净，HEAD为 `1d1b64628860d619e24b561bc49b2eeb435c29cc`（P2-4整合）。box共同基线F=f5236b5及两个独立证明分支保留；框架冻结SHA仍为1ff4352。
- 远端只读查询成功，尚未发现 final 标签；本地开发可继续，远端同步列入交付跟踪，不移动已有标签。
- P2-0 已安装固定开发依赖，CLI 构建/214 项回归、扩展构建/单测、真实宿主和三份字节回放均通过；未修改 CLI 业务源码或执行 Git 写操作。
- 当前整合工作区的A和根配置B均启用stats、dir、box、tree-star。P2-5新增独立内容差异装饰器，box完整包/core/渲染器/loader不变；43文件/399项、单包22项、真实集成12项、双标签A/B与三份无扩展final字节回放通过。当前HEAD仍为1d1b646，新变更未提交，实际tree-star接入SHA及指标在用户提交后补验；本轮未执行Git写操作。

## 后续执行方式

用户可直接指定“开始 P2-0”“开始 P2-1a”等。每次按计划执行该阶段，完成代码、相关验证、文档和证据后结束，不自动跨入下一阶段。已采纳设计与阶段内的常规实现细节无需再次确认；若发现需求冲突或需改变已确认的用户可见语义，应先说明具体冲突。

每阶段报告：完成内容、变更文件、实际测试结果、未通过/未执行项、偏离计划的原因、建议提交说明。用户审阅并完成对应提交后进入依赖该提交的阶段；除非另行授权，不自行 commit/push/tag。零修改证明以真实提交为准，不能用工作区截图代替。

正式课程报告仍在 [doc/README.md](../../doc/README.md)；本目录不是它的替代品。正式 ADR、截图、会话和指标按计划在各阶段产生，避免收尾时补造过程证据。
