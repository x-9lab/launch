const { test } = require("node:test");
const assert = require("node:assert");

const { drivePrompt, KEY } = require("./helpers/stub-inquirer");

/**
 * 这一组用例测的不是本项目的业务, 而是"怎么驱动 inquirer"这件事本身。
 *
 * 桩 inquirer 只能看到菜单构造, 看不到渲染与按键。当需要验证真实交互时,
 * 走 createPromptModule({ input, output }) + PassThrough 假流这条路。
 * 保留这些用例, 是为了让这套手法一旦失效就立刻暴露出来, 而不是等到某天
 * 有人需要它时才发现不能用了。
 *
 * 完整说明见 docs/testing-inquirer.md
 */

const choices = [
    { "name": "代码开发", "value": "dev" }
    , { "name": "代码打包", "value": "build" }
    , { "name": "退出", "value": "exit" }
];

function list(name = "mode") {
    return {
        "type": "list"
        , "loop": false
        , "name": name
        , "message": "运行模式 >> "
        , "choices": choices
    };
}

test("假流可以驱动 list: 回车选中第一项", async () => {
    const { answers } = await drivePrompt(list(), [KEY.enter]);

    assert.deepStrictEqual(answers, { "mode": "dev" });
});

test("假流可以驱动 list: 方向键移动光标", async () => {
    const { answers } = await drivePrompt(
        list()
        , [KEY.down, KEY.down, KEY.enter]
    );

    assert.deepStrictEqual(answers, { "mode": "exit" });
});

test("输出流上拿得到渲染内容, 可对菜单文案做断言", async () => {
    const { screen } = await drivePrompt(list(), [KEY.enter]);

    ["代码开发", "代码打包", "退出"].forEach(text => {
        assert.ok(
            screen.includes(text)
            , `渲染结果里应当出现 ${text}`
        );
    });
});

test("checkbox 用空格勾选, 可多选", async () => {
    const { answers } = await drivePrompt(
        {
            "type": "checkbox"
            , "loop": false
            , "name": "name"
            , "message": "打包项目 >> "
            , "choices": choices
        }
        , [KEY.space, KEY.down, KEY.down, KEY.space, KEY.enter]
    );

    assert.deepStrictEqual(answers, { "name": ["dev", "exit"] });
});

test("用户强制退出的错误前缀没有变, #fire() 的静默处理仍然有效", () => {
    // 注意: 这里不能用假流"按一下 Ctrl+C"来触发。
    //
    // @inquirer/core 的 create-prompt.js 里, 这个错误是挂在 signal-exit 的
    // onExit 上的 —— 也就是说它由**进程退出**触发, 不是由按键触发。往
    // PassThrough 里写  什么也不会发生: 真实终端下是 raw mode 的
    // readline 把 Ctrl+C 变成 SIGINT、进程随之退出, 才轮到 onExit。
    //
    // 所以这里退一步, 只守住 launch.ts 的 #fire() 真正依赖的东西: 错误前缀。
    // 前缀一旦被上游改掉, 用户按 Ctrl+C 就会看到异常堆栈而不是干净退出。
    // 详见 docs/testing-inquirer.md
    const { ExitPromptError } = require("@inquirer/core");
    const error = new ExitPromptError("User force closed the prompt with 0 null");

    assert.ok(
        error.message.startsWith("User force closed the prompt")
        , "launch.ts 的 #fire() 用这个前缀判断用户主动退出并静默吞掉"
    );
});
