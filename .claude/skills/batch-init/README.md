# batch-init skill

为项目内**某个具体的 initiative（EPIC）**一次性 bootstrap **brief → batch → implement** 协作流程。

## 核心概念（先读这段）

**EPIC ≠ 项目**。EPIC 是项目内一个有边界的 named 大型工作流，例如 `AUTH` / `PAYMENT` / `MIGRATE-DB`。一个项目：

- 可以**完全没有 EPIC**——日常开发不需要 brief/batch 流程
- 可以**同时存在多个 EPIC**——`B-AUTH-*` 与 `B-PAYMENT-*` 独立追踪
- 可以**先后启用多个 EPIC**——本 skill 同项目可多次调用

**brief/batch 是"重活通道"，不是默认工作流**。日常 bug 修复、小重构、探索性改动不走这个流程。工程师判定"这事是大活/大功能/大变动/我觉得有必要"时才启用。

## 这个 skill 解决什么

为某个 EPIC 启用 brief / batch 流程时，需要先在仓库里放三样东西，Claude 才能在后续会话中自然按流程走：

1. **CLAUDE.md 增量章节**——告诉 Claude 本工程的 batch 工作流、设计变更停机原则、跑偏自检
2. **`temp/batch-briefs/_template.md`** + **一份示例 brief**——给 Claude 做 pattern-match
3. **`temp/batch-tracking/<EPIC>-master.md` 骨架**——全局总览的承载位置

这三样东西到位后，**之后开新 batch 不需要再调用任何 skill**——直接说"开 B-XXX-1，目标是 YYY"，Claude 读到 CLAUDE.md 自然就会按流程走。

> 设计思路：流程纪律应该是 *dispositional*（由上下文养成的倾向）而不是 *imperative*（由命令触发的程序）。所以这个 skill 只做一次性 bootstrap，不提供 `/batch new`、`/batch check`、`/batch finish` 这些命令式入口。

## 安装

把整个 `batch-init/` 目录复制到目标项目：

```bash
# 在目标项目根
mkdir -p .claude/skills
cp -r <本目录路径> .claude/skills/batch-init
```

之后在该项目里启动 Claude Code，本 skill 就会作为 `/batch-init` 命令出现。

## 使用

在目标项目的 Claude Code 会话里，**为某个具体 initiative** 启动：

```
/batch-init AUTH        # AUTH 是这个 initiative 的代号
```

或不带参数让 Claude 问你 EPIC 代号：

```
/batch-init
```

⚠️ **不要传项目名 / 公司名 / 产品名**——这会被 Claude 误解为"整个项目就是一个大 EPIC"。EPIC 是项目内一个**有边界的具体大活**，例如 "鉴权重构"、"接入支付通道"、"DB 迁移"。

Claude 会：

1. 读项目背景（README / 现有 CLAUDE.md / docs/）+ 确认你传入的 `<EPIC>` 是项目内一个具体 initiative 而不是项目本身
2. 检查目标 EPIC 的 master tracking 是否已存在（已存在则停）；跨 EPIC 共享的 `_template.md` 已存在则跳过不覆盖
3. 落地 4 个文件（详见 `SKILL.md` 步骤 3）
4. 输出 next-steps 提醒你去 master tracking + CLAUDE.md 章节里填禁区 / 全局总览 / 依赖图 / 设计文档路径

完成后**对该 EPIC 只调一次**，后续靠"开 B-`<EPIC>`-N"自然触发。**同项目新启动另一个 EPIC 时再调一次本 skill** 即可。

## 文件清单

```
batch-init/
├── SKILL.md                      # skill 主入口
├── README.md                     # 本文件
└── assets/
    ├── CLAUDE-fragment.md        # 追加到目标项目 CLAUDE.md
    ├── brief-template.md         # 落到 temp/batch-briefs/_template.md
    ├── example-brief.md          # 落到 temp/batch-briefs/B-<EPIC>-1-example.md
    └── master-skeleton.md        # 落到 temp/batch-tracking/<EPIC>-master.md
```

## 验证 checklist（首次在新项目用时）

- [ ] 调用前你已想好这个 EPIC 是项目内**哪个**具体 initiative（不是项目本身）
- [ ] `/batch-init <EPIC>` 调用后，4 个文件出现在预期位置
- [ ] `git diff CLAUDE.md` 显示追加了"`<EPIC>` 实施期硬规则"章节
- [ ] 章节顶部"适用范围"小节明确写出"仅对 `B-<EPIC>-*` 批次生效"
- [ ] 关掉 Claude Code，重开会话，说"开 B-`<EPIC>`-1，目标是 XXX"——Claude 应主动读 brief 模板、设计文档、master tracking，自己起 brief
- [ ] 同会话里再问一个**与 `<EPIC>` 无关**的小问题（例如"帮我看下 README 拼写"），Claude **不应**把它包装成 batch——验证流程不会扩大化
- [ ] 如果以上任一不达标，检查 CLAUDE.md 追加是否成功 / 路径是否对 / 适用范围段落是否完整
