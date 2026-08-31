# {{EPIC}} Master Tracking

> 本文件追踪 `{{EPIC}}` 这一 initiative 的进度。`{{EPIC}}` 是本项目内的一个 named 大型工作流，与本项目其他工作（日常开发 / 其他 EPIC）相互独立。
> 各 batch 的具体改动直接在本文 Task Checklist 里勾选；per-batch 详细 brief 走 `temp/batch-briefs/B-{{EPIC}}-X.md`（开工前 30 分钟现写）。
> 开新 batch 会话时，先对 Claude 说"先读 `temp/batch-tracking/{{EPIC}}-master.md`，再开 B-{{EPIC}}-N，目标是 XXX"，本文件即接管本次开发的工作流硬规则与进度。
> initiative 结束后整份删除，不在项目里留残留。

---

## 工作流硬规则（开 batch 前 Claude 必读）

本节仅对 `B-{{EPIC}}-*` 批次生效。日常 bug 修复 / 小重构 / 与 {{EPIC}} 无关的工作**不走本流程**，按项目常规处理，不要主动把日常任务包装成 batch。

### 设计基线（必读 + 不可绕过）

- **架构设计**: `docs/...`（**请替换为 {{EPIC}} 的设计文档路径**）—— 本 initiative 的 single source of truth
- **Brief 模板**: [`temp/batch-briefs/_template.md`](../batch-briefs/_template.md)
- **本文件**: 进度看板 + 工作流硬规则 + 每个 batch 的 Task Checklist

### 硬约束 / ADR 清单（开工前填实）

- **ADR-N**：一句话约束（例："X SDK 调用只允许出现在 Y 模块内部"）+ review 拒绝标准
- ...

未填写不影响 batch 流程运行，但失去硬约束保障。

### 范围禁区（开工前填实）

写"看似相关但本 initiative 内不做"的事项，防止 scope creep：

- ❌ ...
- ❌ ...

### 设计变更停机原则

实施过程中如果发现设计文档某处不实在 / 需要修订：

- **不要**自行修改架构、增加未在文档中的抽象、绕过禁区
- 必须**停下当前 batch**，把问题提到下方 Open Questions，向用户确认
- 用户确认后先改设计文档（commit 一次）再继续 batch（commit 第二次），两件事不混

### Per-batch 工作流

每个 B-{{EPIC}}-* 批次开工时：

1. 先打开 `temp/batch-briefs/B-{{EPIC}}-X.md`（无则按 [`_template.md`](../batch-briefs/_template.md) 复制并填）
2. 读 brief 中引用的 ADR + 设计文档章节
3. 实施完成后跑 brief 中的"验收清单"
4. 跑下方"跑偏自检 6 条"
5. 单 commit 落地，subject 含 batch 编号

### 跑偏自检 6 条

每个 batch 完成前 Claude 必须自问：

1. 改动是否落在 brief 的 Scope-in 范围内？有没有"顺手做"的越界？
2. 是否触发了上方"范围禁区"中任何一条？
3. 是否绕过了上方"硬约束 / ADR 清单"中任何一条？
4. 设计文档是否需要更新？需要的话停下走"设计变更停机原则"
5. brief 的验收清单是否每项都过？没过的标记原因，不要悄悄忽略
6. commit 是否单一 feature-point？是否包含 Feature-Point / Rollback-Plan 行？

任何一条未过 → 停下，回报用户，不要硬推。

---

## Meta

- Initiative: `{{EPIC}}`（本项目内的一个大型工作流，**不等于项目整体**）
- 一句话描述: `{{INITIATIVE_BRIEF}}`
- 设计文档: `docs/...`（**请把本行替换为 {{EPIC}} 的设计文档路径**）
- Status: `初始化中（B-{{EPIC}}-1 尚未开始）`
- Updated At: `{{DATE}}`
- 范围说明: <一段话写清 `{{EPIC}}` 的边界与不做事项；详细禁区见上方"工作流硬规则 → 范围禁区">

## 全局总览

| Batch | 标题 | 状态 | 依赖 | 工作量 |
|---|---|---|---|---|
| B-{{EPIC}}-1 | <填写标题> | `pending` | 无 | <估时> |
| B-{{EPIC}}-2 | <填写标题> | `pending` | B-{{EPIC}}-1 | <估时> |
| ... | | | | |

## 依赖图

```
B-{{EPIC}}-1 ── B-{{EPIC}}-2 ── ...
```

## Open Questions

记录实施过程中浮现的、需要找用户拍板的问题。每条形如：

- `[YYYY-MM-DD]` <问题描述> — **状态**：待用户确认 / 已确认（结论：...） / 已纳入设计文档

## Follow-ups（批次溢出项停车场）

批次实施中发现的"本批不做但不能丢"的事项。已明确要做但后排的活放这里（区别于 Open Questions——那是等拍板的问题）。转正时开新 batch 或并入现有 batch 的 checklist，注明来源 batch。

- （暂无）

---

## B-{{EPIC}}-1：<标题>

**目标**：<一句话>

**Status**：`pending`

### Task Checklist

- [ ] 1.1 ...
- [ ] 1.2 ...

### Verification

- ...

### 关联 brief

[`temp/batch-briefs/B-{{EPIC}}-1.md`](../batch-briefs/B-{{EPIC}}-1.md)

---

<!-- 后续 batch 按此模板追加 -->
