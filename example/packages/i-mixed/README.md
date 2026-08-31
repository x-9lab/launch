# 测试包 I (混合)

同时有 `package.json` 和 `pyproject.toml`。

清单优先级 `package.json` > `pyproject.toml`，所以：

- 菜单里应显示 `测试包 I (混合, 应走 package.json)`
- `sequence` 应为 `6` 而不是 `99`
- 执行方式应为 `yarn workspace`，与纯 JS 包无差别

`pyproject.toml` 里的内容全部是错的诱饵，看到它就说明优先级实现有问题。

这个场景对应现有带 shim `package.json` 的包：删掉 shim 后自动切到语言清单，行为平滑迁移。
