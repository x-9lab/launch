# 测试包 G (Rust)

只有 `Cargo.toml`，没有 `package.json`。

- 元信息取自 `[package]`
- xlaunch 配置取自 `[package.metadata.xlaunch]`（Cargo Book 官方的第三方工具命名空间）
- 脚本表 `[package.metadata.xlaunch.scripts]` 比 Python 的 `[tool.xlaunch.scripts]` 多一层嵌套，是独立的解析路径
- 包名是裸名（非 npm scoped），用于验证非 JS 包不必遵守 npm 命名规则
- 不放 `src/main.rs`：夹具只被解析，不会真的调用 cargo
