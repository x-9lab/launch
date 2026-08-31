const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const os = require("os");
const fs = require("fs");

const { resolveCommand, job } = require("../dist/helper.js");
const registry = require("../dist/registry.js");

/**造一个包信息 */
function pack(value, extra = {}) {
    return Object.assign({
        "name": `${value}: 测试包`
        , "value": value
        , "index": 1
        , "version": "1.0.0"
        , "isServices": false
        , "isStatic": false
    }, extra);
}

// —— resolveCommand 是纯函数, 直接测 ——

test("package.json 的包仍走 yarn workspace, 行为与旧版一致", () => {
    const cmd = resolveCommand(
        pack("@t/a", { "runner": "yarn-workspace", "scripts": { "build": "tsc" } })
        , "build"
    );

    assert.strictEqual(cmd.command, "yarn");
    assert.deepStrictEqual(cmd.args, ["workspace", "@t/a", "build"]);
    assert.strictEqual(cmd.options, undefined, "不传 options, 沿用 spawn 的默认值");
});

test("shell 包在自己的目录下执行声明的脚本串", () => {
    const cmd = resolveCommand(
        pack("py-pkg", {
            "runner": "shell"
            , "dir": "/tmp/py-pkg"
            , "scripts": { "build": "poetry run build" }
        })
        , "build"
    );

    assert.strictEqual(cmd.command, "poetry run build");
    assert.deepStrictEqual(cmd.args, []);
    assert.strictEqual(cmd.options.cwd, "/tmp/py-pkg");
    assert.strictEqual(
        cmd.options.shell
        , true
        , "用 cross-spawn 的 shell 选项而不是写死 sh -c, 否则等于放弃 Windows"
    );
});

test("没有该脚本时返回 null", () => {
    assert.strictEqual(
        resolveCommand(pack("@t/a", { "runner": "shell", "dir": "/tmp/x", "scripts": {} }), "build")
        , null
    );
});

test("完全没有 scripts 时返回 null", () => {
    // EXIT_PACK 这类菜单哨兵走的就是这条路
    assert.strictEqual(resolveCommand(pack(""), "build"), null);
});

test("shell 包缺少 dir 时返回 null, 不拿 undefined 去执行", () => {
    assert.strictEqual(
        resolveCommand(pack("x", { "runner": "shell", "scripts": { "build": "make" } }), "build")
        , null
    );
});

test("脚本名撞上 Object.prototype 的键时不算已声明", () => {
    // 直接 scripts[task] 会命中原型链, constructor / toString 会被当成
    // "已声明的脚本"。对 shell 包尤其糟糕: 会拿 function Object() {...}
    // 当命令去执行
    const yarnPack = pack("@t/a", { "runner": "yarn-workspace", "scripts": {} });
    const shellPack = pack("x", { "runner": "shell", "dir": "/tmp/x", "scripts": {} });

    ["constructor", "toString", "hasOwnProperty", "valueOf"].forEach(name => {
        assert.strictEqual(resolveCommand(yarnPack, name), null, name);
        assert.strictEqual(resolveCommand(shellPack, name), null, name);
    });
});

test("脚本值不是字符串时视为未声明", () => {
    assert.strictEqual(
        resolveCommand(pack("x", { "runner": "shell", "dir": "/tmp/x", "scripts": { "build": 123 } }), "build")
        , null
    );
});

test("runner 缺失时回退到 yarn workspace", () => {
    const cmd = resolveCommand(pack("@t/legacy", { "scripts": { "build": "tsc" } }), "build");

    assert.strictEqual(cmd.command, "yarn");
});

// —— job() 的顺序与跳过 ——

/**
 * 不依赖真实 yarn workspace: 用 shell runner, 每个包的脚本往同一个文件追加
 * 自己的名字, 文件内容即执行顺序。
 */
const roots = [];
var logFile;

beforeEach(() => {
    registry.setPackages({});
    registry.setBuildSequence([]);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "xlaunch-job-"));
    roots.push(root);
    logFile = path.join(root, "order.log");
});
after(() => roots.forEach(r => fs.rmSync(r, { "force": true, "recursive": true })));

/**登记一个会把自己名字写进 logFile 的 shell 包 */
function shellPack(value, index, scripts) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xlaunch-pkg-"));
    roots.push(dir);
    registry.setPack(value, pack(value, {
        "index": index
        , "runner": "shell"
        , "dir": dir
        , "scripts": scripts
    }));
}

/**追加自身名字的脚本 */
function echoTo(name) {
    return `printf '%s\\n' ${name} >> ${logFile}`;
}

/**读出执行顺序 */
function executed() {
    if (!fs.existsSync(logFile)) {
        return [];
    }
    return fs.readFileSync(logFile, "utf8").trim().split("\n").filter(Boolean);
}

test("job 按 BuildSequence 的顺序串行执行", async () => {
    shellPack("first", 1, { "build": echoTo("first") });
    shellPack("second", 2, { "build": echoTo("second") });
    shellPack("third", 3, { "build": echoTo("third") });
    const seq = registry.genBuildSequence();

    // names 乱序传入, job 应当按 BuildSequence 重排
    await job(["third", "first", "second"], seq, "build");

    assert.deepStrictEqual(executed(), ["first", "second", "third"]);
});

test("未声明该脚本的包被跳过, 且不影响后续包", async () => {
    shellPack("has-build", 1, { "build": echoTo("has-build") });
    shellPack("no-build", 2, { "dev": echoTo("no-build") });
    shellPack("also-has", 3, { "build": echoTo("also-has") });
    const seq = registry.genBuildSequence();

    await job(seq.slice(), seq, "build");

    assert.deepStrictEqual(
        executed()
        , ["has-build", "also-has"]
        , "原先会照样执行 yarn workspace 交给 yarn 报错, 而 try 在循环外, 于是整批中止"
    );
});

test("查不到的包名被跳过, 打包菜单的退出项走这条路", async () => {
    shellPack("real", 1, { "build": echoTo("real") });
    const seq = registry.genBuildSequence();

    // build 菜单的 checkbox 会把退出项的取值一起塞进来
    await job(["real", "exit"], seq.concat(["exit"]), "build");

    assert.deepStrictEqual(executed(), ["real"]);
});

test("某个包执行失败时中止后续, 维持编译失败即停", async () => {
    shellPack("ok-one", 1, { "build": echoTo("ok-one") });
    shellPack("boom", 2, { "build": "exit 1" });
    shellPack("never", 3, { "build": echoTo("never") });
    const seq = registry.genBuildSequence();

    await job(seq.slice(), seq, "build");

    assert.deepStrictEqual(
        executed()
        , ["ok-one"]
        , "boom 之后的 never 不应执行"
    );
});

test("noSort 为真时按 BuildSequence 全量执行", async () => {
    shellPack("a-pkg", 1, { "build": echoTo("a-pkg") });
    shellPack("b-pkg", 2, { "build": echoTo("b-pkg") });
    const seq = registry.genBuildSequence();

    // 全部打包走的就是这条: names 为 null
    await job(null, seq, "build", true);

    assert.deepStrictEqual(executed(), ["a-pkg", "b-pkg"]);
});
