---
name: batch-init
description: 在当前项目为某个具体的 initiative（EPIC）落地 brief → batch → implement 协作流程的最小物料。EPIC 是项目内一个 named 大型工作流（大功能、大变动、大重构），不等于项目本身——同一项目可多次调用，为不同 EPIC 各自落地一份。每个 EPIC 落地后，Claude 读取项目内文件即可自然按流程走，无需后续 skill 调用。
---

# batch-init：为某个 EPIC 一次性 bootstrap 协作流程

## 核心概念（务必先理解再行动）

**EPIC ≠ 项目**。EPIC 是项目内一个具体的、有边界的 named 大型 initiative，例如：

- `AUTH`：登录鉴权重构
- `PAYMENT`：接入新支付通道
- `MIGRATE-DB`：数据库从 X 换到 Y

一个项目可以**完全没有任何 EPIC**（日常开发不需要 brief/batch），也可以**同时存在多个 EPIC**（各自独立追踪）。

**brief → batch 流程是项目内的"重活通道"，不是默认工作流**。日常 bug 修复、小重构、探索性改动**不应**走这个流程。工程师判定"这是大活/大功能/大变动/我觉得有必要"时才启用。

## 触发与边界

**仅在以下情况调用本 skill**：

- 用户明确要为某个 initiative 启用 brief/batch 流程（例如"为 AUTH 这个大活装一下 batch 流程"、"`/batch-init AUTH`"）
- 同项目可多次调用，每次针对**一个 EPIC**

**不要调用本 skill 的情况**：

- 用户说"开 B-XXX-N"——这是开已存在 EPIC 的新 batch，直接读项目里已有的 master tracking + 设计文档 + 历史 brief，自己起 brief 即可
- 用户说"检查跑偏 / 跑验收清单"——同上，自己做即可
- 目标 EPIC 已初始化（`temp/batch-tracking/<EPIC>-master.md` 已存在）——停下，不要覆盖
- 用户只是问日常开发问题——本 skill 不是日常工作流入口

## 输入

调用形态：`/batch-init <EPIC>` 或 `/batch-init`（无参数则问一次）。

`<EPIC>` 是 initiative 代号，全大写短串：例如 `AUTH`、`PAYMENT`、`MIGRATE-DB`。后续 batch 编号形如 `B-AUTH-1`、`B-AUTH-2`。

如果用户传入的疑似不是 EPIC 而是项目名（例如直接传入项目代号或公司名），**停下来确认**："你是想为整个项目装这个流程吗？通常 batch 流程是为某个具体 initiative（大功能/大变动）启用的；你这次想做的具体 initiative 是什么？"

## 行动步骤

### 步骤 1：理解项目背景 + 确认 EPIC 边界（必做）

在落地任何文件前，先做一次轻量背景理解。这一步**同时验证 EPIC 概念是否被正确理解**。

执行：

1. 读项目根 `README.md`（如有）和 `CLAUDE.md`（如有），了解项目主语言、技术栈、当前阶段
2. 查项目是否已有其他 EPIC：`ls temp/batch-tracking/*-master.md 2>/dev/null`。若有，说明本项目已经在用 batch 流程，本次是**新加一个 EPIC**；落地时不要覆盖共享文件（template / 已有 master）
3. 问自己一句：**用户这次提的 `<EPIC>` 是项目内一个具体的大活，还是整个项目本身？** 如果听起来像后者（例如代号是公司名、产品名、仓库名），停下来追问用户："这次具体要做的 initiative 是什么？范围有多大？"。EPIC 必须有明确边界，否则 brief 流程退化无效
4. 问 EPIC 的设计文档：`ls docs/` 看现有材料；如果 `<EPIC>` 没有任何设计文档（架构图、需求 PRD、技术方案都没有），**停下告诉用户**："`<EPIC>` 还没有设计锚点，建议先写一份再启用 batch 流程——brief 没有锚点就退化成 TODO list"。让用户决定先写设计还是硬装

通过步骤 1 后，你应当能用 1 句话回答："`<EPIC>` 这个 initiative 在本项目内要做 XX，设计锚点是 `docs/...`。"

### 步骤 2：preflight 检查

并行执行：

```bash
ls temp/batch-briefs/ 2>/dev/null; ls temp/batch-tracking/ 2>/dev/null
```

判断（按以下优先级，不要乱来）：

- **目标 EPIC 已初始化** → `temp/batch-tracking/<EPIC>-master.md` 已存在 → 停下，告诉用户"该 EPIC 已初始化过，请直接说'开 B-`<EPIC>`-N' 开新 batch"，**不要覆盖**
- **共享 brief 模板已存在** → `temp/batch-briefs/_template.md` 已存在 → **跳过模板写入**（跨 EPIC 共享，不要覆盖）；继续落其他文件
- **git working tree 不干净** → 提醒用户但不强制停

### 步骤 3：落地文件

读本 skill 同目录 `assets/`，替换占位符后写入：

| 资产 | 目标路径 | 占位符替换 | 已存在时的策略 |
|---|---|---|---|
| `assets/brief-template.md` | `temp/batch-briefs/_template.md` | `{{EPIC}}` → EPIC | **已存在则跳过**（跨 EPIC 共享） |
| `assets/example-brief.md` | `temp/batch-briefs/B-{{EPIC}}-1-example.md` | `{{EPIC}}` → EPIC | 已存在则跳过 |
| `assets/master-skeleton.md` | `temp/batch-tracking/{{EPIC}}-master.md` | `{{EPIC}}` → EPIC；`{{DATE}}` → 今天日期；`{{INITIATIVE_BRIEF}}` → 步骤 1 得出的 1 句话 EPIC 描述 | 已存在则停（在步骤 2 已挡） |

注意：

- **工作流硬规则（设计基线 / ADR / 范围禁区 / 停机原则 / 跑偏自检）全部住在 master 文件头部**（骨架已含该节）。**不要把任何 EPIC 物料写进项目根 `CLAUDE.md`**——EPIC 是临时 initiative，CLAUDE.md 是项目长期约定，二者不混；initiative 结束删 master 即可，不留残留
- 所有写入完成后，跑 `ls temp/batch-briefs/ temp/batch-tracking/ && git status` 让用户看到落地结果

### 步骤 4：输出 next-steps

给用户一段简短的 next-steps：

1. 已落地（或跳过）的文件清单
2. 提醒去 `temp/batch-tracking/<EPIC>-master.md` 把**工作流硬规则（设计文档路径 / ADR 清单 / 范围禁区）+ 全局 batch 总览 / 依赖图**填实——skill 只放骨架，因为只有用户知道
3. 告诉用户：之后开新 batch 直接说"先读 `temp/batch-tracking/<EPIC>-master.md`，再开 B-`<EPIC>`-1，目标是 XXX"，**不需要再调用本 skill**——Claude 读到 master 自然会按流程走
4. **再次强调边界**："本流程仅对 B-`<EPIC>`-* 批次生效，日常开发 / 其他 EPIC 不受影响"

## 不要做的事

- 不要把 `<EPIC>` 误解为整个项目——用户在 x-astra 那种含多 EPIC 的工程里反复踩过这个坑
- **不要改项目根 `CLAUDE.md`**——EPIC 硬规则住 master 文件，不进 CLAUDE.md（用户明确要求过，2026-07-05）
- 不要替用户填禁区清单 / ADR 硬约束 / 依赖图——这些必须用户自己填（用户明确要求"综合资料代填"时可以填，但要标注待 review）
- 不要覆盖跨 EPIC 共享的 `_template.md`
- 不要 commit。落地完留给用户自己 commit
