## v1.3.0

### ⚠️ 升级须知

- **运行环境要求由 Node `>=14` 提升到 `>=18`**。TOML 解析依赖 `smol-toml`，它要求 Node 18；Node 14 与 16 分别已于 2023-04、2023-09 EOL。
- **开启了 `enableCache` 的项目升级后请执行一次 `xlaunch --clean`**。缓存结构本次变更（新增 `dir` / `runner` / `scripts`），缓存文件已加入 schema 与 cwd 标识，不匹配时会自动失效，但主动清一次更稳妥。
- **行为变更**：批量任务遇到未声明该脚本的包时，从「交给 yarn 报错并中止整批」改为「明确提示跳过并继续」。某个包**执行失败**仍然中止后续，语义不变。
- **另一个值得注意的修复**：`spawn` 在子进程退出码非 0 且静默模式（默认）下，promise 既不 resolve 也不 reject，会永远挂起 —— 表现为「打包时卡住不动」。已修复，现在会明确报错并中止。
- **自定义菜单**：新增 `xlaunch.resolveCommand(pack, task)` 与 `xlaunch.getPackByName(name)`。菜单里若写死了 `yarn workspace`，迁移非 JS 包后会执行错，请改用前者。

### 多语言支持

子包不再必须是 JavaScript 项目。`scan` 按 `package.json` → `pyproject.toml` → `Cargo.toml` 的优先级探测清单，配置分别落在各语言官方留给第三方工具的命名空间（`[tool.xlaunch]` / `[package.metadata.xlaunch]`），版本号只有一份。

`package.json` 排在语言清单之前是刻意的：现有为了被识别而放了 shim `package.json` 的包行为完全不变，删掉 shim 后自动切换到语言清单。详见 README 的「多语言支持」。

### Feat
- feat(api): 全局对象暴露 resolveCommand 与 getPackByName [fad0d0c](https://github.com/x-9lab/launch/commit/fad0d0c24cf84fdbb60b4a954e12a02bfdf75658)
- feat(runner): B-POLYGLOT-6 按包的 runner 决定执行方式 [e897dd1](https://github.com/x-9lab/launch/commit/e897dd164cc7533d445d6c655008e5a77cf8f060)
- feat(manifest): B-POLYGLOT-5 支持 pyproject.toml 与 Cargo.toml 清单 [454841e](https://github.com/x-9lab/launch/commit/454841e43ede5543db043b846490928ed2889e89)

### Fix
- fix(scan): 包名与脚本名撞上 Object.prototype 时的误判 [3448d00](https://github.com/x-9lab/launch/commit/3448d0043ef7c8f3f238d13c5a49763c3dabd431)
- fix(spawn): 修复子进程非 0 退出码时 promise 永远挂起 [a6a06fb](https://github.com/x-9lab/launch/commit/a6a06fb0524d46d52accad69c2feaed726be1e85)

### Chore
- chore(tsconfig): 移除两个将在 TypeScript 7.0 失效的选项 [ecb0145](https://github.com/x-9lab/launch/commit/ecb014549f11898cbfa47c22484c1dcc1f27b38a)
- chore: 纳入 CLAUDE.md 与 batch-init skill [6fad4e3](https://github.com/x-9lab/launch/commit/6fad4e3085d1e04c2481e6a9282f425308b2d9f9)

### Refactor
- refactor(registry): B-POLYGLOT-3 抽离包信息注册表 [ff8b4a3](https://github.com/x-9lab/launch/commit/ff8b4a35df39e0a240e525ab5c1631ae6e541f87)

## v1.2.4

### Fix
- fix(scan): B-POLYGLOT-2 修复单个包读取失败导致整个扫描中断 [82bef80](https://github.com/x-9lab/launch/commit/82bef80e265d6418568d195a3dc05dd7a5b61522)

### Build
- build: 增加屏蔽文件夹，增加 claude 设置 [d200bc7](https://github.com/x-9lab/launch/commit/d200bc73b2fc48f12502290e4123eb1c37ffadc7)

## v1.2.3

### Feat
- feat: 多个内置菜单增加退出选项 [604a1be](https://github.com/x-9lab/launch/commit/604a1be1f09caecca1555d96bea20a7b40681795)

### Fix
- fix: 修复强制退出时出现的异常信息 [f2774b2](https://github.com/x-9lab/launch/commit/f2774b23ca1e1eff3c2f10ca2f285ccf13e54ab8)

## v1.2.1

### Fix
- fix: 修复因缓存文件导致的问题 [dabf5b5](https://github.com/x-9lab/launch/commit/dabf5b5b36a73252f54a7314dd5c5620b33a0766)

### Feat
- feat: 增加 Inquirer 类型导出 [8a7675e](https://github.com/x-9lab/launch/commit/8a7675e8dbd30840ed6ae0e5f79d932eb4086175)
- feat: 升级基础模块并针对性调整项目代码 [99265d1](https://github.com/x-9lab/launch/commit/99265d1efacd683773dceabc2908250024922967)

## v1.2.0

### Feat
- feat: 增加 Inquirer 类型导出 [42fbcb4](https://github.com/x-9lab/launch/commit/42fbcb4962668e4a30a3c98b4d21415904d6d1e9)
- feat: 升级基础模块并针对性调整项目代码 [7775603](https://github.com/x-9lab/launch/commit/7775603e5967387998f36c8c883ab24d09ce49a6)
- feat: 增加是否是直接部署的静态文件配置支持 [d2b71f3](https://github.com/x-9lab/launch/commit/d2b71f31d248b158fe39019d2193d003f6069967)
- feat: 现在用户进程退出默认不显示异常信息 [88499fc](https://github.com/x-9lab/launch/commit/88499fc2ff64c50b3723b399552f693891a8869d)

### Build
- build: 禁止粘性滚动给 [127ae94](https://github.com/x-9lab/launch/commit/127ae94d73456846d61d4145ebcf37073801fd6a)

## v1.1.2

### Feat
- feat: 增加处理中勾子支持, 修改业务扫描逻辑, 现在明确不支持带有 . 的文件或文件夹 [263e496](https://github.com/x-9lab/launch/commit/263e496a35ebd22180bf61b0fa0284678c12167f)

### Chore
- chore: 增加任务执行的前置提示信息 [f2e0913](https://github.com/x-9lab/launch/commit/f2e0913edf661c47c31c334f465e83269b3cb2b0)

## v1.1.1

### Fix
- fix: 修复缓存清除模式不生效的问题 [446b0ef](https://github.com/x-9lab/launch/commit/446b0efa70a99b3e523e3228cdd99382f274a348)

### Feat
- feat: 支持从模块缓存以支持从缓存启动，提供清除缓存功能，增加独立 patchs 文件夹并将原有 patch 迁移到该文件夹 [0dc2a4e](https://github.com/x-9lab/launch/commit/0dc2a4efec7ea23ab7398bbbf1eaee75f3f0753b)

## v1.1.0

### Feat
- feat: 支持从模块缓存以支持从缓存启动，提供清除缓存功能，增加独立 patchs 文件夹并将原有 patch 迁移到该文件夹 [c70dc76](https://github.com/x-9lab/launch/commit/c70dc76fcda6a5096d7b9b1d36b6c291c79d8b3e)
- feat: xlaunch.spawn 支持与 spawn 一样的完整参数 [a8c2ea1](https://github.com/x-9lab/launch/commit/a8c2ea150d6d31e00938458d15bd7afbb474bac6)
- feat: 独立输出 交互菜单操作函数 的类型 [ecd5061](https://github.com/x-9lab/launch/commit/ecd50613e31499eee06468c36d10e4c178e17749)
- feat: 允许不显示某些菜单,包括预置菜单 [363239c](https://github.com/x-9lab/launch/commit/363239c4137fa14b431c105d5a915fd52d6a5a5e)
- feat: types 文件作为独立文件夹输出 [7ccd757](https://github.com/x-9lab/launch/commit/7ccd7571233a8ef10d7902fada1b6fda2fbcbbe0)
- feat: 使用 colors/safe ，避免污染 prototype [17de73a](https://github.com/x-9lab/launch/commit/17de73ab44611d107f4d8d493012f3bab7518d1f)

### Fix
- fix: 修复 example 中 version.js 显示问题 [8ff5cd4](https://github.com/x-9lab/launch/commit/8ff5cd4d43bd07081a2b67ef75adf600630afb7d)

## v1.0.1

### Feat
- feat: types 文件作为独立文件夹输出 [33fda01](https://github.com/x-9lab/launch/commit/33fda01fa6648f8bd885a741bd68de383dfdd6c6)
- feat: 使用 colors/safe ，避免污染 prototype [713ae24](https://github.com/x-9lab/launch/commit/713ae24394cc5a8adeafab9ba6d4b15fa594e28d)

## v1.0.0

### Feat
- feat: 扫描目录时不提示找不到 package.json 的错误 [39706d1](https://github.com/x-9lab/launch/commit/39706d154135eb99ef3ab155b3fe02d63ed71480)
- feat: 启动选项改为将某个包指定为在根目录上启动 [878e43d](https://github.com/x-9lab/launch/commit/878e43dd3a605a10ad65c78a9f36a46c49e54b9a)
- feat: 启动支持只定义某些(个)命令在根目录执行 [0110369](https://github.com/x-9lab/launch/commit/01103695e89316aaf3abfb18da72423c912b314f)
- feat: 支持选项钩子 [26a842f](https://github.com/x-9lab/launch/commit/26a842f8f90ed4a65328a2d6a7dbf19025b9c35b)
- feat: launch 类独立成一个模块并增加 getConfig 方法，start 选项支持读取根目录下的命令 [5ebae06](https://github.com/x-9lab/launch/commit/5ebae06716a5460d35d58fb2a79817c35bc4abbc)
- feat: 支持业务自定义菜单 [53e7ca2](https://github.com/x-9lab/launch/commit/53e7ca268e56dec47dbb131d382898fff416c127)
- feat: 多个菜单增加退出选项 [8c5cb19](https://github.com/x-9lab/launch/commit/8c5cb198dae97963cff0e2e8221a0ff8d7fa30a2)
- feat: 修改 org 为 x-9lab [1c2559e](https://github.com/x-9lab/launch/commit/1c2559ec8e6a50aca83166d31c5f3d1290d78ca9)
- feat: 支持常用开发模式选项并提供使用例子 [43aff7b](https://github.com/x-9lab/launch/commit/43aff7bb72230240d087b3b17130ee7325f877c9)

### Chore
- chore: 更新例子及说明文档 [5593b0b](https://github.com/x-9lab/launch/commit/5593b0b2fd7cc308370b0648d089dedcbf9f3410)

### Fix
- fix: 修复没有 hooks 时的异常，修改 startAtRoot 配置类型 [9bd505a](https://github.com/x-9lab/launch/commit/9bd505a25bed393e56234e225dd1044ea06f01bd)
- fix: 修复 onEnd 钩子不生效的问题 [abafede](https://github.com/x-9lab/launch/commit/abafedecd8ea79c730ac4206c024e174450360eb)

