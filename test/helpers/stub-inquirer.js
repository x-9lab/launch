const { createPromptModule } = require("inquirer");
const { PassThrough } = require("stream");

/**
 * 按键序列
 *
 * inquirer 从 input 流读原始按键, 所以方向键要写终端转义序列。
 */
const KEY = {
    "up": String.fromCharCode(27) + "[A"
    , "down": String.fromCharCode(27) + "[B"
    , "enter": "\n"
    // checkbox 用空格勾选, build 菜单在用
    , "space": " "
};

// 这里刻意没有 Ctrl+C。@inquirer/core 把 "User force closed the prompt" 挂在
// signal-exit 的 onExit 上, 由**进程退出**触发而非按键; 往 PassThrough 里写
// 0x03 什么也不会发生。详见 docs/testing-inquirer.md

/**
 * 桩 inquirer: 只捕获菜单构造, 不做真实渲染
 *
 * 本项目所有菜单模块都以 inquirer 为第一个参数 (dev / start / build /
 * 自定义菜单的 processor 亦然), 所以注入桩不需要改任何生产代码。
 *
 * @param answers 依次作为每一层 prompt 的返回值; 用尽后抛错终止, 避免
 *                菜单继续往下走真的去 spawn 进程
 */
function stubInquirer(answers = []) {
    const asked = [];
    var round = 0;

    const inquirer = {
        prompt(questions) {
            const question = Array.isArray(questions) ? questions[0] : questions;
            asked.push({
                "name": question.name
                , "message": question.message
                , "type": question.type
                , "choices": (question.choices || []).map(item => ({
                    "name": item.name
                    , "value": item.value
                }))
            });
            if (round >= answers.length) {
                return Promise.reject(new StubExhausted());
            }
            const answer = answers[round];
            round++;
            return Promise.resolve(answer);
        }
    };

    return { inquirer, asked };
}

/**桩预设答案用尽时抛出, 用于终止菜单流程 */
class StubExhausted extends Error {
    constructor() {
        super("stub inquirer answers exhausted");
    }
}

/**
 * 用假流驱动真实的 inquirer prompt
 *
 * 项目用的是 legacy 的 inquirer.prompt([...]) API, createPromptModule 支持
 * 传入自定义 input / output 流, 于是无需 TTY 也能跑通完整交互与渲染。
 *
 * @param  question 单个 question 对象
 * @param  keys     按键序列, 取自 KEY
 * @param  timeout  看门狗时限, 毫秒
 * @return { answers, screen } 或 { error, screen }
 */
function drivePrompt(question, keys, timeout = 2000) {
    const input = new PassThrough();
    const output = new PassThrough();
    var screen = "";
    output.on("data", chunk => {
        screen += chunk.toString();
    });

    const prompt = createPromptModule({ "input": input, "output": output });
    const pending = prompt([question]);

    keys.forEach((key, index) => {
        setTimeout(() => input.write(key), 40 * (index + 1));
    });

    // 看门狗有两个作用:
    // 1. 持住事件循环。按键写完之后若没有活跃 handle, 循环会在 promise 结算前
    //    就排空, node:test 会把用例记为 cancelled ——  Ctrl+C 那条就是这么被坑的
    // 2. 万一 prompt 真的挂住, 给出可读的失败而不是整个套件卡死
    var guard;
    const watchdog = new Promise((res, rej) => {
        guard = setTimeout(
            () => rej(new Error(`prompt 在 ${timeout}ms 内没有结算`))
            , timeout
        );
    });

    return Promise.race([
        pending.then(
            answers => ({ answers, screen })
            , error => ({ error, screen })
        )
        , watchdog
    ]).finally(() => {
        clearTimeout(guard);
        input.end();
    });
}

module.exports = { stubInquirer, drivePrompt, KEY, StubExhausted };
