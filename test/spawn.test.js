const { test } = require("node:test");
const assert = require("node:assert");

const { spawn, SpawnError } = require("../dist/helper.js");

/**
 * 这一组用例守的是一个曾经存在的严重 bug: quiet 为真(默认值)且子进程退出码
 * 非 0 时, promise 既不 resolve 也不 reject, 永远挂起。
 *
 * 而 job() / dev / start 全部用默认的 quiet。所以某个包编译失败时,
 * xlaunch 不是"停下来报错", 而是静默卡死 —— job() 里那个打印 failure 的
 * catch 对非 0 退出码根本不可达。
 *
 * 每个用例都带超时, 一旦回归就是超时失败而不是整个套件挂住。
 */

/**给 promise 加超时, 挂起时给出可读的失败 */
function within(promise, ms = 3000) {
    var guard;
    const watchdog = new Promise((res, rej) => {
        guard = setTimeout(
            () => rej(new Error(`promise 在 ${ms}ms 内没有结算, spawn 又挂起了`))
            , ms
        );
    });
    return Promise.race([promise, watchdog]).finally(() => clearTimeout(guard));
}

/**跑一条 shell 命令, 不往测试输出里灌东西 */
function run(script, quiet) {
    return spawn("sh", ["-c", script], { "stdio": "ignore" }, quiet);
}

test("退出码为 0 时 resolve", async () => {
    assert.strictEqual(await within(run("exit 0")), true);
});

test("退出码非 0 且 quiet 为默认值时也必须结算", async () => {
    await assert.rejects(
        within(run("exit 1"))
        , err => {
            assert.ok(err instanceof SpawnError, "应当抛 SpawnError 而不是超时");
            assert.strictEqual(err.code, 1);
            return true;
        }
    );
});

test("退出码非 0 且 quiet 为假时同样 reject", async () => {
    await assert.rejects(
        within(run("exit 3", false))
        , err => err instanceof SpawnError && err.code === 3
    );
});

test("被信号杀掉不算失败", async () => {
    // 用户 Ctrl+C 停掉 dev 服务走的就是这条路: code 为 null、signal 有值。
    // 这是正常操作, 不该报错。
    assert.strictEqual(
        await within(run("kill -TERM $$"))
        , true
    );
});

test("命令不存在时 reject", async () => {
    await assert.rejects(
        within(spawn("这个命令不存在-xlaunch-test", [], { "stdio": "ignore" }))
        , err => {
            assert.strictEqual(err.code, "ENOENT");
            return true;
        }
    );
});

test("quiet 只控制是否打印, 不控制是否结算", async () => {
    // 两种 quiet 都必须结算, 区别只在有没有往 stderr 打东西
    const quiet = await within(run("exit 2")).then(() => "resolved", e => e.code);
    const loud = await within(run("exit 2", false)).then(() => "resolved", e => e.code);

    assert.strictEqual(quiet, 2);
    assert.strictEqual(loud, 2);
});
