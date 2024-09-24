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

