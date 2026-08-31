# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

`@x-9lab/launch` 是一个发布到 npm 的 CLI 工具（bin 名 `xlaunch`），为 monorepo 提供交互式操作菜单。它在启动时扫描宿主项目的 `packages/` 目录，读取各子包 `package.json` 的元信息生成 inquirer 菜单，再通过 `yarn workspace <pkg> <script>` 代为执行命令。

本仓库本身不是 monorepo —— 它是那个工具。`example/` 才是一个被工具驱动的 lerna/yarn workspaces 示例仓库。

## 常用命令

```bash
yarn                  # 安装依赖（.npmrc 指向 npmmirror 镜像）
yarn dev              # swc watch 模式编译 src -> dist
yarn compile          # swc 单次编译
yarn gen-declaration  # tsc --emitDeclarationOnly -> @types/
yarn build            # compile + gen-declaration，发布前必须执行
yarn test             # yarn build + node --test，见下
yarn changelog        # 由 @x-drive/changelog 从 commit 生成 CHANGELOG.md
```

## 测试

用 Node 自带的 `node:test`，**没有第三方测试框架**（没有 jest / vitest，也没有 lint 配置）。测试在 `test/`，不进 npm 包 —— `package.json` 的 `files` 是白名单 `["dist", "@types"]`，无需 `.npmignore`。

```bash
yarn test    # = yarn build && node --test "test/**/*.test.js"
```

**测试跑的是 `dist/` 不是 `src/`**（项目没有 TS 运行时），所以 `yarn test` 必须先 build；改完源码直接 `node --test` 是在测旧产物。注意 `node --test test/` 会把 `test/` 当模块解析而报错，且不带参数运行会把 `test/helpers/` 也当成用例文件，所以固定用 glob 形式。

xlaunch 全部界面都是 inquirer 交互菜单，自动化时没有终端可用。**观察和驱动菜单的手段、边界与已知的坑，全部写在 [`docs/testing-inquirer.md`](docs/testing-inquirer.md)，动菜单相关代码前先读它** —— 里面记了三种手段（桩 inquirer / 子进程读 registry / 假流驱动真实 prompt）、按键字节表，以及几个会让人写出假绿用例的陷阱（`scan.onEnd` 里退出会导致缓存路径永远测不到；Ctrl+C 用假流根本触发不了；排序行为在 APFS 上测不出来）。

手动验证仍然有价值，尤其是交互观感：

```bash
yarn build
cd example && yarn            # 首次需要安装 workspaces 依赖
yarn clean-launch-cache       # enableCache 为 true，不清缓存会看到上一轮结果
yarn launch                   # 实际执行 ../dist/bin/launch
```

`example/` 已覆盖大部分特性：自定义菜单（`@launch/@inquirer/compile.js`）、启动 Logo（`@launch/version.js`）、hooks、`startAtRoot` 按包指定、`ignoreMenus`、`enableCache`，以及带 `sequence` / `isServices` 的子包 a–e，另有 `f-python` / `g-rust` / `h-nomanifest` / `i-mixed` 四个多语言清单夹具。

## 构建产物与 git

`dist/` 和 `@types/` 都被 `.gitignore` 忽略，但都在 `package.json` 的 `files` 中 —— 它们是本地生成、随 npm 发布、不入库的产物。看到工作区里有这两个目录属于正常状态，不要提交它们。

`src/bin/launch` 是一段带 shebang 的纯 JS，被 swc 原样拷贝到 `dist/bin/launch`（`swc src -D ./src/bin`），不参与 TS 编译。

## 架构

### 启动链路

1. `src/bin/launch` —— 用 **Liftoff** 从 cwd 向上查找 `xlaunch.config.js` / `xlaunch.config.json`，再 `require("../")` 加载本包。命令行参数：`-c/--clean`（清缓存后退出）、`-r/--root`（cwd）、`-f/--file`（指定配置文件）。
2. `src/index.ts` —— 通过 `Object.defineProperty` 把单例 `XLaunch` 挂到 **global.xlaunch**（不可写），并用 `declare global` 声明 `XLaunchConfig` / `XLaunchInquirerExport` / `XLaunchInquirerExportProcessor`。
   全局对象在 `loadConfig()` 之前就已存在，这是用户配置文件能在顶层直接调用 `xlaunch.hooks({...})`、自定义菜单能直接用 `xlaunch.EXIT_PACK` / `xlaunch.spawn` 的原因。
3. `src/launch.ts` —— `Launch` 类，`boot()` 依次执行私有方法 `#version()`（打 Logo）→ `#scan()`（扫包、扫自定义菜单）→ `#fire()`（弹出一级菜单并分发）。`#fire()` 只是**启动** prompt 就返回，不 await，所以 `boot()` 返回时扫描与缓存都已完成。
4. `src/registry.ts` —— `Packages` / `BuildSequence` 的存放处。独立成模块是为了让 `helper.ts` 能按包名反查而不与 `launch.ts` 构成模块环（CJS 下环在初始化期拿到的是半成品 exports）。

### 包扫描

`scan()` 读取 `path.resolve(process.cwd(), "packages")` 下的每个目录的 `package.json`。注意这里用的是 `process.cwd()`，**不是** `config.cwd`。

从子包 `package.json` 读取的约定字段：

- `sequence` —— 编译顺序。未声明时填入 `MAGIC_CODE`（709394，`src/consts.ts`）排到最后；`-1` 表示完全排除出可操作列表。
- `isServices` —— 该包是否出现在「环境启动」菜单中。
- `isStatic` —— 是否为直接部署的静态文件。
- `description` —— 拼进菜单显示名。

目录判定用 `Dirent` 的 `isDirectory() || isSymbolicLink()` —— 软链一定要一并放行，否则软链过来的包会从「能识别」变成「识别不到」。遍历前按目录名排序，因为 `readdirSync` 的顺序由文件系统决定。`genBuildSequence()` 按 `index` 排序产出 `BuildSequence`（包名数组），`helper.job()` 按该顺序串行执行 `yarn workspace <name> <task>`。

`Packages` 以**业务目录名**为键，而 `IPack.value` 是清单里声明的**包名**，`BuildSequence` 与菜单选项传的都是后者 —— 所以需要 `registry.getPackByName()` 反查。

### 菜单体系

内置菜单一一对应 `src/@inquirer/` 下的模块，由 `launch.ts` 的 `ModeTypes` 枚举分发：

| value | 模块 | 调用的 script |
| --- | --- | --- |
| `dev` | `dev.ts` | 子包 `dev` |
| `start` | `start.ts` | 子包或根目录 `start-dev` / `start-prod` / `start-debug` |
| `build` | `build.ts` | 子包 `build`（支持全部/部分打包） |
| `boot` | `sys-boot.ts` | 根目录 `boot` |
| `patch` | `patch.ts` | 内置补丁，见 `src/components/patchs/` |
| `exit` | — | 保留值，`process.exit(0)` |

自定义菜单：扫描 `<config.cwd>/<scriptDirName>/<inquirerDirName>`（默认 `@launch/@inquirer`）下的 `.js` 文件，**文件名即菜单 value**，模块须导出 `{ name, processor }`（`XLaunchInquirerExport`）。`processor(inquirer, Packages, BuildSequence)` 由 launch 注入参数。与上表中的内置 value 重名会被拒绝并打印警告。

`helper.walk()` 递归时会跳过以 `.` 开头的文件、`.d.ts` 文件，以及**名字中含 `@` 的子目录** —— 所以 `@inquirer` 目录内不能再嵌套 `@` 开头的子目录。

### 缓存

开启 `enableCache` 后，`{packages, buildSequence, customs}` 被写入 `path.join(__dirname, ".temp", "xlaunch.cache.json")` —— 即**已安装包自身的 `dist/.temp/` 目录内**，不在宿主项目里。新增子包或改动菜单模块后必须 `xlaunch --clean`（`cleanCache()` 直接 `rm -rf` 整个 `.temp`）。缓存命中时 `scan()` 完全跳过磁盘扫描，走 `#startFromCache()`。

### Hooks

`xlaunch.hooks({ [menuValue]: { onStart, onEnd, onProcessing } })`。特殊之处：`scan` 这个 key 上的 `onProcessing` 会作为**每个包元信息的处理函数**传给 `scan(processor)`，`onEnd` 则拿到完整的 `Packages` —— 与其它菜单 key 上单纯的前后置回调语义不同。

## 代码风格

沿用现有写法，不要「规范化」：

- 4 空格缩进，**逗号前置**的多行对象/数组（`, "key": value`）。
- 对象字面量的 key 一律加引号。
- JSDoc 注释用中文，所有面向用户的输出也是中文并带 emoji 前缀。
- `tsconfig.json` 是宽松模式（`strict: false`、`noImplicitAny: false`、`strictNullChecks: false`）。
- inquirer v11 的类型定义与本项目用法有冲突，现有代码用 `as any` + `// @FIXME: 这里的类型定义告警` 绕过，遇到同类问题照此处理。
- 工具函数优先从 `@x-drive/utils` 取（`copy` / `merge` / `isObject` / `isExecutable` / `isBoolean` / `isString` / `isArray` / `isUndefined`）。
- 用户主动 Ctrl+C 时 inquirer 抛出以 `User force closed the prompt` 开头的错误，`#fire()` 中静默吞掉 —— 新增 prompt 时注意保持这一行为。该错误实际由 `@inquirer/core` 挂在 signal-exit 的 `onExit` 上，**由进程退出触发而非按键**，所以假流测不出来，详见 [`docs/testing-inquirer.md`](docs/testing-inquirer.md) 第五节。
- TypeScript preferred for new frontend code
- 4-space indentation, camelCase identifiers, arrow functions, comma-first style in objects/imports
- Chinese comments are acceptable when they add local context
- **One commit = one independently revertible feature point.** Cross-area changes (backend/frontend/infra) must be split into separate commits.
- Commit subject format: `<type>(<scope>): <subject>` with `feat|fix|docs|style|refactor|perf|test|chore`.
- Commit body should include `Feature-Point:` and `Rollback-Plan:` lines.
- 使用中文进行编写中提交信息
- 不要带上 Anthropic 或 Claude 或 Claude Code 的信息

## 文档同步

新增或修改配置项、约定字段、全局对象 API 时，需同步更新：`README.md`（面向用户的完整说明）、`src/index.ts` 中的 `declare global` 声明，以及必要时 `example/xlaunch.config.js` 中的示例。

项目文档放 `docs/`。摸清了 inquirer 的新观察/驱动手法，或踩到新的测试陷阱，写进 [`docs/testing-inquirer.md`](docs/testing-inquirer.md) —— 那份文档的价值就在于把「试出来才知道」的东西留住。

## Important

Use first-principles thinking: start from the raw requirements and the essence of the problem, not from conventions or templates.

1. Don’t assume I know exactly what I want. If the motivation or goal is unclear, pause and discuss it.
2. If the goal is clear but the path isn’t the shortest, tell me directly and suggest a better approach.
3. When problems arise, get to the root cause—don’t slap on patches. Every decision should be able to answer “why.”
4. Get to the point. Cut anything that doesn’t change the decision.

