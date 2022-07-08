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

