# monorepo 项目管理操作菜单 Launch

monorepo 类型的项目，在项目规模上一定规模后包含的子项目变多会使开发需要记住不同包的包名和不同的命令，`launch` 在启动的时候会扫描项目目录，根据包 `package.json` 中的信息收集信息并产生相关的操作菜单，为开发提供便捷。

业务自项目 `package.json` 相关字段：
- `scripts` 字段中的 `dev` 命令为代码开发命令，`build` 为生产编译命令
- `scripts` 字段中的 `start-dev` 命令为开发环境启动命令，`start-prod` 为生产环境启动命令，`start-debug` 为 debug 环境启动命令
- `sequence` 用于定义包编译顺序

## 开发
1. clone 项目到本地
1. 安装项目依赖
    ```shell
    yarn
    ```
1. 执行 `yarn dev` 开始开发
1. 执行 `yarn build` 编译模块生产模式

## 注意事项
1. 部分脚本使用了 nodeJS 的高版本特性，需要 nodeJs v14 以上版本

## 配置文件
- 支持 `xlaunch.config.json` 或 `xlaunch.config.js` 为配置文件
- 配置项
  - `scriptDirName` Launch 扩展目录名，默认为 `@launch`
  - `cwd` 执行目录，默认为 `process.cwd()`
  - `wellcomFileName` 启动 Logo 输出文件名，默认为 `version.js`
  - `inquirerDirName` 交互菜单目录名称，默认为 `@inquirer`
  - `startAtRoot` 环境启动命令在根目录，默认 `false`
  - `showStartDebugEnv` 显示启动 debug 环境，默认 `false`

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
- `hooks` 设置某个(些)选项开始/结束的钩子

  定义：
  ```ts
  /**选项钩子 */
  interface IHook {
    /**业务开始执行前 */
    onStart?: () => boolean;

    /**业务执行后 */
    onEnd?(): boolean;
  }
  ```
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
`launch` 调用指定包 `package.json` scripts 字段中的 `dev` 命令

### 代码打包
`launch` 调用指定包 `package.json` scripts 字段中的 `build` 命令

### 环境启动
根据选择的启动类型，开发环境调用指定包 `package.json` scripts 字段中的 `start-dev` 命令，生产环境调用 `start-prod` 命令

### 初始化项目
`launch` 调用根目录下 `package.json` scripts 字段中的 `boot` 命令

### 打补丁
由于一些原因，某些开源包存在一些问题，`launch` 提供了一些影响较大的补丁的修复能力

### 退出
退出 `launch` 的选项操作

### 定义多个包之间可能存在依赖关系
在多个包同时编译时需要按照一定顺序进行。`launch` 在执行的时候会根据子包的 `package.json` 中的 `sequence` 字段做排序，按数字顺序编译以确保输出结果。开发者需要自己维护这个编译顺序。

  特殊取值：
    - **709394** 其它未声明 `sequence` 字段的子包，该值由 `launch` 自动添加，请不要占用
    - **-1** 不纳入可操作的包列表

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