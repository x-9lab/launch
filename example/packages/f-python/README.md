# 测试包 F (Python)

只有 `pyproject.toml`，没有 `package.json`。

- 元信息取自 `[project]`
- xlaunch 配置取自 `[tool.xlaunch]`（PEP 518 官方的第三方工具命名空间）
- `sequence = 0`，编译顺序排在所有 JS 包之前，用于验证跨语言统一排序
