const { test } = require("node:test");
const assert = require("node:assert");

const { stubInquirer, StubExhausted } = require("./helpers/stub-inquirer");

const dev = require("../dist/@inquirer/dev.js").default;
const start = require("../dist/@inquirer/start.js").default;
const build = require("../dist/@inquirer/build.js").default;

/**
 * 菜单模块都以 inquirer 为第一个参数, 所以注入桩不需要改生产代码。
 *
 * 桩的预设答案用尽时会 reject, 用来在菜单真正去 spawn 进程之前把流程掐断 ——
 * 这些用例只关心菜单构造, 不该真的执行命令。
 */
async function collect(run) {
    try {
        await run();
    } catch (e) {
        if (!(e instanceof StubExhausted)) {
            throw e;
        }
    }
}

const Packages = {
    "a": {
        "name": "A: 测试包 A", "value": "@t/a", "index": 1
        , "version": "1.0.0", "isServices": false, "isStatic": false
    }
    , "b": {
        "name": "B: 测试包 B", "value": "@t/b", "index": 2
        , "version": "1.0.0", "isServices": true, "isStatic": false
    }
    , "c": {
        "name": "C: 测试包 C", "value": "@t/c", "index": 3
        , "version": "1.0.0", "isServices": true, "isStatic": false
    }
};

/**取某一层菜单的 value 列表 */
function values(asked, level) {
    return asked[level].choices.map(item => item.value);
}

test("代码开发菜单列出全部包并附带退出项", async () => {
    const { inquirer, asked } = stubInquirer([]);

    await collect(() => dev(inquirer, Packages));

    assert.strictEqual(asked.length, 1);
    assert.strictEqual(asked[0].type, "list");
    assert.deepStrictEqual(values(asked, 0), ["@t/a", "@t/b", "@t/c", ""]);
});

test("代码打包先问打包类型", async () => {
    const { inquirer, asked } = stubInquirer([]);

    await collect(() => build(inquirer, Packages, ["@t/a", "@t/b", "@t/c"]));

    assert.deepStrictEqual(values(asked, 0), ["all", "part", "exit"]);
});

test("选择部分打包后用 checkbox 列出全部包", async () => {
    const { inquirer, asked } = stubInquirer([{ "name": "part" }]);

    await collect(() => build(inquirer, Packages, ["@t/a", "@t/b", "@t/c"]));

    assert.strictEqual(asked.length, 2);
    assert.strictEqual(asked[1].type, "checkbox");
    assert.deepStrictEqual(values(asked, 1), ["@t/a", "@t/b", "@t/c", "exit"]);
});

test("环境启动菜单默认不显示 DEBUG 环境", async () => {
    const { inquirer, asked } = stubInquirer([]);

    await collect(() => start(inquirer, Packages, {}));

    assert.deepStrictEqual(values(asked, 0), ["start-dev", "start-prod", ""]);
});

test("showStartDebugEnv 打开后出现 DEBUG 环境", async () => {
    const { inquirer, asked } = stubInquirer([]);

    await collect(() => start(inquirer, Packages, { "showStartDebugEnv": true }));

    assert.deepStrictEqual(
        values(asked, 0)
        , ["start-dev", "start-prod", "start-debug", ""]
    );
});

// 注意: start.ts 里的 services 是模块级数组, 且靠 length === 0 判断是否填充,
// 一个进程内只会构建一次。所以"项目列表"相关的用例本文件只能有这一个,
// 再加会读到上一个用例留下的内容。该隐患已记入 master 的 Follow-ups。
test("环境启动的项目列表只含 isServices 为真的包", async () => {
    const { inquirer, asked } = stubInquirer([{ "env": "start-dev" }]);

    await collect(() => start(inquirer, Packages, {
        "startAtRoot": { "@t/c": true }
    }));

    assert.strictEqual(asked.length, 2, "第一层选环境, 第二层选项目");
    assert.deepStrictEqual(
        values(asked, 1)
        , ["@t/b", "@t/c", ""]
        , "a 的 isServices 为假, 不应出现"
    );
});

// startAtRoot 为 true 的分支无法在此覆盖: 它选完环境就直接 spawn("yarn", [env]),
// 桩 inquirer 拦得住菜单, 拦不住 spawn。测试套件不该真的执行命令, 要补这个用例
// 得先给 spawn 加一层可替换的执行器。
//
// 注: 最初这里记的原因是"spawn 会挂死", 那个 bug 是写本用例时发现的, 已由
// fix(spawn) 修掉, 现在它会干脆地 reject。
