# monorepo 项目管理操作菜单 Launch

monorepo 类型的项目，在项目规模上一定规模后包含的子项目变多会使开发需要记住不同包的包名和不同的命令，`launch` 在启动的时候会扫描项目目录，根据各子包的清单文件收集信息并产生相关的操作菜单，为开发提供便捷。

子项目清单相关字段：
- `scripts` 中的 `dev` 命令为代码开发命令，`build` 为生产编译命令
- `scripts` 中的 `start-dev` 命令为开发环境启动命令，`start-prod` 为生产环境启动命令，`start-debug` 为 debug 环境启动命令
- `sequence` 用于定义包编译顺序

子包不必是 JavaScript 项目 —— 除 `package.json` 外也支持 `pyproject.toml` 与 `Cargo.toml`，见「多语言支持」。

## 开发
1. clone 项目到本地
1. 安装项目依赖
    ```shell
    yarn
    ```
1. 执行 `yarn dev` 开始开发
1. 执行 `yarn build` 编译模块生产模式

## 注意事项
1. 部分脚本使用了 nodeJS 的高版本特性，需要 nodeJs v18 以上版本（v1.3.0 起由 v14 提升，Node 14 / 16 均已 EOL）
1. 正常情况 js 环境也能识别到模块的相关定义，如发现各种定义提示失效，也可手动引入定义，如使用注释引入:
    ```ts
    // @filename: @x-9lab/launch/@types/index.d.ts
    /**
    * 配置项
    * @type {XLaunchConfig}
    */
    const Conf = {
        "startAtRoot": {
            "@x-9lab/launch-example-e": true
        }
        , "showStartDebugEnv": true
    };

    ```

## 多语言支持

`launch` 在每个子包目录下按以下优先级探测清单文件，命中即用：

```
package.json  >  pyproject.toml  >  Cargo.toml
```

`package.json` 排在语言清单之前是**刻意的**：现有为了被 launch 识别而放了 shim `package.json` 的包，行为完全不变；删掉 shim 后自动切换到语言清单，版本号从此只有一份。这给出一条零风险的迁移路径。

xlaunch 的配置落在各语言官方留给第三方工具的命名空间里，不自造位置：

| 清单 | 元数据取自 | xlaunch 配置写在 |
| --- | --- | --- |
| `package.json` | 顶层字段 | 顶层字段（与旧版一致） |
| `pyproject.toml` | `[project]` | `[tool.xlaunch]`（PEP 518） |
| `Cargo.toml` | `[package]` | `[package.metadata.xlaunch]`（Cargo Book） |

三种清单都没有的目录会被跳过，并在启动时汇总提示一次。

### Python 子包

```toml
[project]
name = "gaia-flywheel"
version = "1.0.1"
description = "质量自省飞轮"

[tool.xlaunch]
sequence = 20
isServices = true

[tool.xlaunch.scripts]
build = "docker build -t gaia-flywheel ."
dev = ".venv/bin/flywheel-service --reload"
"start-dev" = ".venv/bin/flywheel-service"
```

### Rust 子包

```toml
[package]
name = "sensor-driver"
version = "0.3.0"
description = "传感器驱动"

[package.metadata.xlaunch]
sequence = 30

[package.metadata.xlaunch.scripts]
build = "cargo build --release"
dev = "cargo watch -x run"
```

### 执行方式

| 清单 | 执行方式 |
| --- | --- |
| `package.json` | `yarn workspace <包名> <脚本>`，与旧版一致 |
| 其它 | 在**包目录下**直接执行声明的脚本串 |

分界线是「要不要经 yarn workspace 代理」，不是语言 —— 需要代理是因为依赖提升与软链归 yarn 管。其余一律在包目录下执行脚本串，`poetry run` / `cargo` / `docker compose` 都写进脚本串即可，不需要额外的执行方式。

`sequence` 与 `isServices` 等约定字段跨语言统一生效，编译顺序也在所有语言的包之间统一排序。

### 注意

- **非 JS 包不再需要 shim `package.json`**。删掉它之后，该包也会一并脱离 yarn workspaces、`lerna` 与 changelog 的覆盖范围 —— 后两者只认 `package.json`，这是本设计有意的取舍
- 没有任何机器可读清单的项目（例如只有 `Makefile` 的 C 项目）目前不支持
- 开启 `enableCache` 时缓存结构随本次改动变更，升级后请执行一次 `xlaunch --clean`

## 配置文件
- 支持 `xlaunch.config.json` 或 `xlaunch.config.js` 为配置文件
- 配置项
    - `scriptDirName` Launch 扩展目录名，默认为 `@launch`
    - `cwd` 执行目录，默认为 `process.cwd()`
    - `wellcomFileName` 启动 Logo 输出文件名，默认为 `null`
    - `inquirerDirName` 交互菜单目录名称，默认为 `@inquirer`
    - `startAtRoot` 环境启动命令在根目录，默认 `false`
        - 可以单独指定某个包是在根目录上执行，被指定的包清单中 `isServices` 字段必须为 `true`
    ```js
    /**
    * 配置项
    * @type {XLaunchConfig}
    */
    const Conf = {
        "startAtRoot": {
            "@x-9lab/launch-example-e": true
        }
    };
    ```
    - `showStartDebugEnv` 显示启动 debug 环境，默认 `false`
    - `enableCache` 是否开启模块缓存
        注意，该功能可以加快命令启动速度，但新增业务模块或修改菜单功能时需要执行一次更新命令
        ```bash
        xlaunch --clean
        ```
    - `ignoreMenus` 屏蔽内置菜单或某个(些)菜单
        - 取值为 `true` 时蔽所有内置菜单
            ```js
            /**
            * 配置项
            * @type {XLaunchConfig}
            */
            const Conf = {
                // 为 true 时屏蔽所有内置菜单
                "ignoreMenus": true
            };
            ```
        - 为对象时根据指定的键名屏蔽指定的菜单，此时不区分是否是内置菜单
            ```js
            /**
            * 配置项
            * @type {XLaunchConfig}
            */
            const Conf = {
                // 单独指定屏蔽某菜单
                "ignoreMenus": {
                    "patch": true
                    // 也可屏蔽自定义菜单
                    // , "compile": true
                }
            };
            ```

## 全局对象
`launch` 提供了一个全局对象 `xlaunch`，可在 `nodeJs` 环境下直接调用
- `spawn` spawn 模式执行一条命令
    ```js
    xlaunch.spawn("yarn", [answers.type]);
    ```
- `EXIT_PACK` 获取一个标准退出选项
    ```js
    const menus = [
        {
            "name": "关机"
            , "value": "shutdown"
        }
        , xlaunch.EXIT_PACK
    ];
    ```
- `boot` 主启动函数，每个实例只会执行一次
    ```js
    xlaunch.boot();
    ```
- `loadConfig` 加载项目配置控制文件
    ```js
    xlaunch.loadConfig(configPath);
    ```
- `getConfig` 获取项目配置
    ```js
    const onRoot = XLaunch.getConfig("startAtRoot");
    ```
- `getPackByName` 按包名反查包信息，查不到返回 `undefined`（**v1.3.0 新增**）
    ```js
    const pack = xlaunch.getPackByName("@scope/some-pkg");
    ```
- `resolveCommand` 解析出一条可执行命令，自动按包的 `runner` 分派（**v1.3.0 新增**）
    ```js
    const cmd = xlaunch.resolveCommand(pack, "build");
    // package.json 的包 -> { command: "yarn", args: ["workspace", "<包名>", "build"] }
    // 其它清单的包     -> { command: "<脚本串>", args: [], options: { shell: true, cwd: "<包目录>" } }
    // 未声明该脚本     -> null
    if (cmd) {
        await xlaunch.spawn(cmd.command, cmd.args, cmd.options);
    }
    ```
- `hooks` 设置某个(些)选项开始/结束的钩子

    定义：
    ```ts
    /**选项钩子 */
    interface IHook {
        /**业务开始执行前 */
        onStart?: () => boolean;

        /**业务执行后 */
        onEnd?(): boolean;

        /**处理中 */
        onProcessing?: () => boolean;
    }
    ```

    键名为菜单取值（`dev` / `start` / `build` / `boot` / `patch`，或你自定义菜单的文件名）。
    例子：
    ```js
    xlaunch.hooks({
        "boot": {
            onEnd() {
                console.log("⌛️ Boot end...");
            }
            , onStart() {
                console.log("⏳ Boot start...");
            }
        }
    });
    ```

    **`scan` 这个键上的语义与其它菜单不同**：它不是「前后置回调」，而是介入包扫描本身。

    ```js
    xlaunch.hooks({
        "scan": {
            /**
             * 每扫描到一个包时调用一次，返回值会成为该包最终的信息
             * @param pack 已归一化的包信息，即 IPack
             * @param meta 解析后的**原始清单对象**
             */
            onProcessing(pack, meta) {
                pack.releaseTo = meta.releaseTo;
                return pack;          // 忘记 return 会导致该包信息丢失
            }

            /**扫描全部结束后调用，拿到完整的 Packages */
            , onEnd(Packages) {
                console.log("共发现", Object.keys(Packages).length, "个包");
            }
        }
    });
    ```

    > ⚠️ **v1.3.0 起 `meta` 的类型取决于该包用的是哪种清单**：`package.json` 的包拿到的仍是 `package.json` 内容（与旧版一致）；`pyproject.toml` / `Cargo.toml` 的包拿到的是解析后的 TOML 对象，字段路径形如 `meta.project.name`、`meta.package.metadata.xlaunch`。如果你的钩子直接读了 `package.json` 的自定义字段，请先判断清单类型再取值。

## 使用
1. 将 `@x-9lab/launch` 加入到 `devDependencies`
1. `package.json` 中调用 `xlaunch`
    ```json
    {
        "scripts": {
            "launch": "xlaunch"
        }
    }
    ```
简单用法请参考 `example` 中的项目

### 代码开发
`launch` 调用指定包清单中声明的 `dev` 脚本

### 代码打包
`launch` 调用指定包清单中声明的 `build` 脚本

### 环境启动
根据选择的启动类型，开发环境调用指定包清单中声明的 `start-dev` 脚本，生产环境调用 `start-prod`

### 初始化项目
`launch` 调用根目录下 `package.json` scripts 字段中的 `boot` 命令

### 打补丁
由于一些原因，某些开源包存在一些问题，`launch` 提供了一些影响较大的补丁的修复能力

### 退出
退出 `launch` 的选项操作

### 定义多个包之间可能存在依赖关系
由于多个包之间可能存在依赖关系，在多个包同时编译时需要按照一定顺序进行。`launch` 在执行的时候会根据子包清单中的 `sequence` 字段做排序，按数字顺序编译以确保输出结果，**排序在所有语言的包之间统一生效**。开发者需要自己维护这个编译顺序。

未声明某个脚本的包会被明确跳过并提示，不会中断整批任务；某个包执行失败则中止后续。

特殊取值：
- 709394 其它未声明 `sequence` 字段的子包，该值由 `launch` 自动添加，请不要占用
- -1 不纳入可操作的包列表

### 自定义菜单

`launch` 初始化时会扫描 `scriptDirName` 指定目录下 `inquirerDirName` 指定的目录中的 `js` 文件并尝试将模块作为新的选项加入到一级选项中
- 文件名做为新增选项取值
- 模块必须返回符合 `XLaunchInquirerExport` 定义的数据结构
    ```ts
    /**用户自定义交互菜单模块导出对象 */
    interface XLaunchInquirerExport {
        /**交互菜单名称 */
        name: string;

        /**交互菜单操作函数 */
        processor(inquirer?: Inquirer, Packages?: IPackages, BuildSequence?: string[]): void;
    }
    ```

#### processor 收到的参数

`Packages` 以**业务目录名**为键，`BuildSequence` 是按 `sequence` 排好序的**包名**数组 —— 两者的键不同，需要用 `value` 反查。

```ts
/**单个包的信息 */
interface IPack {
    /**菜单显示名，形如 "A: 描述" */
    name: string;

    /**包名，即清单里声明的 name。菜单取值与 BuildSequence 用的都是它 */
    value: string;

    /**编译顺序。未声明时为 709394 */
    index: number;

    /**包版本 */
    version: string;

    /**是否是可运行的服务 */
    isServices: boolean;

    /**是否是直接部署的静态文件 */
    isStatic: boolean;

    /**包所在绝对路径 */
    dir?: string;

    /**执行方式 */
    runner?: "yarn-workspace" | "shell";

    /**该包声明的脚本，键为脚本名 */
    scripts?: Record<string, string>;
}
```

`dir` / `runner` / `scripts` 自 **v1.3.0** 起提供。`EXIT_PACK` 这类菜单哨兵不是包，这三个字段为空，读取时请做防御。

#### 自定义菜单里执行某个包的命令

**不要写死 `yarn workspace`** —— 那只对 `package.json` 声明的包成立，非 JS 包会被静默执行错。用 `xlaunch.resolveCommand` 代为分派：

```js
/**@type {XLaunchInquirerExportProcessor} */
async function processor(inquirer, Packages) {
    const pack = xlaunch.getPackByName("your-pkg");
    const cmd = pack && xlaunch.resolveCommand(pack, "build");
    if (!cmd) {
        console.log("该包不存在或未声明 build 脚本");
        return;
    }
    await xlaunch.spawn(cmd.command, cmd.args, cmd.options);
}
```

`resolveCommand` 返回 `null` 表示该包没声明这个脚本；否则返回 `{ command, args, options }`，直接摊给 `xlaunch.spawn` 即可。两者都是 **v1.3.0** 新增。