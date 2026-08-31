# 如何观察与驱动 inquirer 菜单

xlaunch 的界面全部是 inquirer 交互菜单。菜单一旦弹出就等待按键，人可以直接看、直接按，
但**开发过程中的自动化验证（以及 AI 协作时的观察）没有终端可用**，必须换手段。

本文记录本项目实测有效的三种手段、各自的适用边界，以及踩过的坑。

相关：测试代码在 [`test/`](../test)，`yarn test` 一键跑。

---

## 一、三种手段，按代价从低到高

| 手段 | 能看到什么 | 需要改生产代码吗 | 用在哪 |
|---|---|---|---|
| ① 桩 inquirer | 菜单构造（choices / message / type） | 不需要 | `test/menu.test.js` |
| ② 子进程 + 读 registry | 扫描结果、构建顺序、终端告警 | 不需要 | `test/scan.test.js` |
| ③ 假流驱动真实 prompt | 渲染文本、按键交互、最终答案 | 不需要 | `test/prompt-harness.test.js` |

**能用 ① 就别用 ③。** ① 是同步的、确定的；③ 涉及流、定时器和渲染，慢且容易写出假绿或挂死的用例。

---

## 二、手段①：桩 inquirer（首选）

本项目所有菜单模块**都以 `inquirer` 为第一个参数**：

```ts
dev(inquirer, Packages)
start(inquirer, Packages, config)
build(inquirer, Packages, BuildSequence)
```

用户自定义菜单的 `processor(inquirer, Packages, BuildSequence)` 也是同一形态。这是现成的依赖注入，
换个假的进去就能把「这个菜单会渲染成什么」整个捕获下来，不需要动任何生产代码。

```js
const { stubInquirer, StubExhausted } = require("./helpers/stub-inquirer");

const { inquirer, asked } = stubInquirer([{ "name": "part" }]);
await build(inquirer, Packages, BuildSequence).catch(e => {
    if (!(e instanceof StubExhausted)) { throw e; }
});

asked[0].choices;   // 第一层: 全部打包 / 部分打包 / 退出
asked[1].type;      // 第二层: "checkbox"
```

### 预设答案用尽时要主动掐断

桩的 `answers` 用尽后会 reject 一个 `StubExhausted`。**这是刻意的**：菜单选完最后一层就会真的去
`spawn` 子进程，测试既不该真执行命令，也不该等它。少给一个答案，让流程停在你想看的那一层。

### 一个真实的坑：`start.ts` 的 `services` 是模块级数组

```ts
const services = [];                 // 模块级
if (services.length === 0) { ...填充... }
```

一个进程里只会填充一次。所以**同一个测试文件里，依赖「项目列表」的用例只能有一个**，
第二个会读到上一个留下的内容。`node:test` 只保证文件之间进程隔离。

### 有一条分支盖不住

`startAtRoot` 为 `true` 时，选完环境直接 `spawn("yarn", [env])`，没有可注入的接缝。
而 `helper.spawn` 在 `quiet` 为真（默认）且子进程退出码非 0 时**既不 resolve 也不 reject**，
promise 永远挂起。测试套件不该真执行命令，更不该挂死，所以这条分支暂缺覆盖。

---

## 三、手段②：子进程 + 读 registry

用来观察扫描结果。有两个非踩不可的坑。

### 坑 1：`BasePath` 在 require 时就定死了

```ts
const BasePath = path.resolve(process.cwd(), "packages");   // 模块级常量
```

它在 `require("dist/launch.js")` 那一刻就从 `process.cwd()` 求值。**同一个进程里无法换夹具目录**，
所以每个夹具场景开一个子进程，带自己的 `cwd`：

```js
spawnSync(process.execPath, ["-e", code], { "cwd": fixtureRoot });
```

见 [`test/helpers/scan-in-child.js`](../test/helpers/scan-in-child.js)。

### 坑 2：不要在 `scan.onEnd` 钩子里退出

`xlaunch.hooks({ scan: { onEnd(Packages) {...} } })` 是公开 API，能直接拿到扫描结果，看起来最方便。
但 `#scan()` 的顺序是：

```
scan() → scan.onEnd 钩子 → genBuildSequence() → 扫自定义菜单 → saveToCache()
```

**`saveToCache` 在钩子之后。** 在 `onEnd` 里 `process.exit(0)`，缓存就永远写不出来，
`#startFromCache()` 那条路径一次也测不到 —— 这个盲区实际发生过。

正确做法是等 `boot()` 返回后直接读 registry 单例。`boot()` 里的 `#fire()` 只是**启动** prompt
就返回（没有 await），所以 `boot()` 返回时扫描与缓存都已完成：

```js
xlaunch.boot({ "wellcomFileName": null });
const reg = require("dist/registry.js");
reg.getPackages();
reg.getBuildSequence();
```

### 断言告警文本要先去 ANSI

告警是 `colors.yellow(\`⚠️ 跳过 ${colors.bold(name)}: ...\`)`，`bold` 把包名单独包了一层，
所以原始输出里 `跳过 f-python:` 中间夹着转义码，直接 `includes` 匹配不到。先 strip：

```js
text.replace(new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g"), "");
```

### 别忘了缓存

`example/xlaunch.config.js` 里 `enableCache: true`。**手动验证前必须 `yarn clean-launch-cache`**，
否则 `scan()` 整个被跳过，你看到的是上一轮的结果，钩子也不会触发。

---

## 四、手段③：假流驱动真实 prompt

本项目用的是 legacy 的 `inquirer.prompt([...])` API。`createPromptModule` 支持传入自定义流，
于是不需要 TTY 也能跑完整交互：

```js
const { createPromptModule } = require("inquirer");
const { PassThrough } = require("stream");

const input = new PassThrough();
const output = new PassThrough();
let screen = "";
output.on("data", d => { screen += d.toString(); });

const prompt = createPromptModule({ "input": input, "output": output });
const pending = prompt([question]);

setTimeout(() => input.write(KEY.down), 40);
setTimeout(() => input.write(KEY.enter), 80);
```

### 按键序列

inquirer 从 input 流读原始按键，方向键要写终端转义序列：

| 键 | 字节 |
|---|---|
| 上 | `[A` |
| 下 | `[B` |
| 回车 | `\n` |
| 空格（checkbox 勾选） | `' '` |

`build` 菜单的「部分打包」用的是 checkbox，**空格勾选、回车提交**，实测多选返回 `["a", "c"]`。

### 必须加看门狗

按键写完后如果没有活跃 handle，事件循环会在 promise 结算前排空，`node:test` 会把用例记成
**cancelled** 而不是 failed —— 一个「既没通过也没失败」的幽灵状态，很难查。
用 `Promise.race` 加一个超时既能持住循环，又能在真挂住时给出可读的失败信息。
见 [`test/helpers/stub-inquirer.js`](../test/helpers/stub-inquirer.js) 的 `drivePrompt`。

---

## 五、Ctrl+C 测不了（重要）

`launch.ts` 的 `#fire()` 靠这个前缀把用户主动退出静默吞掉：

```ts
if (e.message.startsWith("User force closed the prompt")) { return; }
```

**很自然会想「往流里写个 `` 就能测」。不行。** 看 `@inquirer/core` 的源码：

```js
// node_modules/@inquirer/core/dist/cjs/lib/create-prompt.js
cleanups.add(onExit((code, signal) => {
    reject(new ExitPromptError(`User force closed the prompt with ${code} ${signal}`));
}));
```

`onExit` 来自 **signal-exit** —— 它由**进程退出**触发，不是由按键触发。真实终端下的链路是
「raw mode 的 readline 把 Ctrl+C 变成 SIGINT → 进程退出 → onExit 触发」，
而 `PassThrough` 没有 raw mode，写进去的 `0x03` 只是一个普通字节，什么也不会发生。

> 调研时曾观察到这个 rejection「确实抛出来了」，一度以为按键有效。实际是当时那个脚本没有持住
> 事件循环，进程自然退出触发了 `onExit` —— 错误消息里的 `with 0 null` 就是证据：退出码 0、无信号。
> 因果搞反了。

**现在的做法**：退一步，只守住 `#fire()` 真正依赖的东西 —— 错误消息的前缀。
构造一个 `ExitPromptError` 断言前缀即可，前缀被上游改掉时测试会红，
提醒你 Ctrl+C 会开始给用户抛异常堆栈。

---

## 六、测试自身的局限，别当成保障

写下来是为了不产生虚假的安全感：

- **「遍历前按目录名排序」在 macOS 上测不出来。** APFS 的 readdir 本身就返回字典序（与创建顺序无关），
  把 `sort` 整段删掉用例照样绿。它只挡得住「排错序」，挡不住「没排序」。
  真正会暴露的是 ext4 / XFS 这类按 hash 返回的文件系统
- **测试跑的是 `dist/`，不是 `src/`。** 项目没有 TS 运行时，所以 `yarn test` 会先 `yarn build`。
  改完源码直接 `node --test` 是在测旧产物
- **变异检验值得做。** 故意把修好的行为改坏，看用例是否变红。本项目的软链用例经此确认有效，
  排序用例经此确认无效（见上）

---

## 七、验证一个改动的完整流程

```bash
yarn test                                    # 自动化，先跑这个

yarn build                                   # 手动确认交互观感时
cd example && yarn clean-launch-cache && yarn launch
```

`example/` 里的夹具（`f-python` / `g-rust` / `h-nomanifest` / `i-mixed`）覆盖了非 JS 清单、
无清单、混合清单三类场景，各自 `README.md` 写了它该表现成什么样。
