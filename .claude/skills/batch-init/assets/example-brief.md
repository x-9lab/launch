# B-{{EPIC}}-1：示例 brief（请删除或参考后另起）

> 本文件由 `/batch-init {{EPIC}}` 生成，是给 Claude 做 pattern-match 的示例样本。
> 这是一个**虚构的示例**，仅展示 brief 的结构和粒度。不要按此例去做事——请删掉本文件，照 `_template.md` 起你**真实的第一个 batch**。
>
> 示例选了一个常见 EPIC（"AUTH：登录鉴权重构"）作为虚构语境，让你看到一个具体 EPIC 内**第一个 batch** 的 brief 长什么样。你自己的 EPIC 可能完全不一样，照模板写即可。

---

## Goal

落地新鉴权链路的最小骨架：定义 token 数据结构 + 一个 issue token 接口 + 一个 verify 接口，让后续 batch 有 API 表面可挂。

具体 done 的样子：调用 `POST /auth/v2/token`（mock 用户）能返回结构化 token；调用 `GET /auth/v2/verify` 带上该 token 能返回 200。

## Scope

- **in**:
  - 新增 `auth/v2/` 模块目录与 token 数据结构定义
  - 新增 `POST /auth/v2/token`（mock 用户校验，先不接真用户库）
  - 新增 `GET /auth/v2/verify`
  - 两端点的单元测试
- **out**（明确不做，防 scope creep）:
  - 接入真实用户库（B-{{EPIC}}-2）
  - Refresh token / 过期处理（B-{{EPIC}}-3）
  - 替换现有 v1 鉴权或迁移老路由（专门的迁移 batch）
  - 任何前端改动

## Constraining ADRs / 设计章节

- **设计文档 §2 鉴权数据模型**：本批只实现"最小数据结构"，不引入 §3+ 的高级字段
- **跑偏自检 6 条**：完成前必跑

## 涉及文件

| 路径 | 改动 |
|---|---|
| `<auth 模块路径>/v2/__init__.py`（或同等入口）| 新建 |
| `<auth 模块路径>/v2/token.py` | 新建：token 数据结构 + issue / verify 函数 |
| `<auth 模块路径>/v2/router.py` | 新建：2 个端点 |
| `<test 路径>/v2/test_token.py` | 新建：覆盖 issue + verify 正常路径 |
| 主 app 路由注册位置 | 改动：挂载 `auth/v2` 路由 |

## 参照模式

- 参考 `<现有同形态模块路径>` 学本项目的 router/service 分层惯例
- 不参考 v1 auth 实现——v1 的若干历史包袱正是 {{EPIC}} 要解决的

## 验收清单（手动）

- [ ] `<项目构建命令>` 通过
- [ ] 单元测试通过：`<具体命令>`
- [ ] `curl -X POST http://localhost:<port>/auth/v2/token -d '<mock payload>'` 返回带 token 的 JSON
- [ ] 用上一步返回的 token 调 `GET /auth/v2/verify` 返回 200
- [ ] 跑偏自检 6 条逐项过

## 常见坑

- Claude 倾向"顺手把 v1 的 token 模型也对齐一下"——拒绝，本 batch 不碰 v1
- 不要在 token 数据结构里加任何"将来可能要"的字段（refresh_token / scope / device_id 等）——B-{{EPIC}}-3 再说
- mock 用户校验就用硬编码列表，不要为此引入新的 mock 框架

## 提交计划

- subject: `feat({{EPIC}}): B-{{EPIC}}-1 鉴权 v2 骨架与最小端点`
- Feature-Point: `B-{{EPIC}}-1 落地 auth/v2 模块骨架（token 数据结构 + issue/verify 端点）`
- Rollback-Plan: `删除 auth/v2/ 目录、撤销路由注册、删除对应测试文件`

---

## 实施日志（开工后填）

- YYYY-MM-DD HH:MM 开始
- YYYY-MM-DD HH:MM 完成
