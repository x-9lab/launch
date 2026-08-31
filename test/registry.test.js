const { test, beforeEach } = require("node:test");
const assert = require("node:assert");

const registry = require("../dist/registry.js");

/**
 * registry 是模块单例, 同一个测试文件内的用例共享状态。
 * node:test 只保证文件之间进程隔离, 所以每个用例前手动重置。
 */
beforeEach(() => {
    registry.setPackages({});
    registry.setBuildSequence([]);
});

/**造一个包信息 */
function pack(value, index) {
    return {
        "name": `${value}: 测试包`
        , "value": value
        , "index": index
        , "version": "1.0.0"
        , "isServices": false
        , "isStatic": false
    };
}

test("setPack 以业务目录名为键登记", () => {
    registry.setPack("dir-a", pack("@t/a", 1));

    assert.deepStrictEqual(Object.keys(registry.getPackages()), ["dir-a"]);
    assert.strictEqual(registry.getPackages()["dir-a"].value, "@t/a");
});

test("getPackByName 按清单声明的包名反查, 而不是目录名", () => {
    registry.setPack("dir-a", pack("@t/a", 1));

    assert.strictEqual(registry.getPackByName("@t/a").value, "@t/a");
    assert.strictEqual(
        registry.getPackByName("dir-a")
        , undefined
        , "目录名不是包名, 不应查得到"
    );
});

test("getPackByName 查不到时返回 undefined", () => {
    assert.strictEqual(registry.getPackByName("不存在"), undefined);
});

test("包名重复时 getPackByName 只能查到第一个", () => {
    registry.setPack("dir-a", pack("@t/dup", 1));
    registry.setPack("dir-b", pack("@t/dup", 2));

    assert.strictEqual(
        registry.getPackByName("@t/dup").index
        , 1
        , "这是已知局限: 重名的第二个包永远查不到。扫描时需要显式告警"
    );
});

test("genBuildSequence 按 index 升序产出包名数组", () => {
    registry.setPack("dir-c", pack("@t/c", 30));
    registry.setPack("dir-a", pack("@t/a", 10));
    registry.setPack("dir-b", pack("@t/b", 20));

    assert.deepStrictEqual(
        registry.genBuildSequence()
        , ["@t/a", "@t/b", "@t/c"]
    );
    assert.deepStrictEqual(
        registry.getBuildSequence()
        , ["@t/a", "@t/b", "@t/c"]
    );
});

test("setPackages 整体替换, 缓存启动走这条路", () => {
    registry.setPack("dir-a", pack("@t/a", 1));
    registry.setPackages({ "dir-z": pack("@t/z", 9) });

    assert.deepStrictEqual(Object.keys(registry.getPackages()), ["dir-z"]);
    assert.strictEqual(
        registry.getPackByName("@t/a")
        , undefined
        , "整体替换后旧内容不应残留"
    );
    assert.strictEqual(
        registry.getPackByName("@t/z").value
        , "@t/z"
        , "替换后 getPackByName 必须看到新内容, 不能持有旧引用"
    );
});

test("setBuildSequence 整体替换", () => {
    registry.setBuildSequence(["@t/a"]);
    registry.setBuildSequence(["@t/x", "@t/y"]);

    assert.deepStrictEqual(registry.getBuildSequence(), ["@t/x", "@t/y"]);
});
