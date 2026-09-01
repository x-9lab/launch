const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

/**问 npm 这个包会打进哪些文件 */
function packedFiles() {
    const ret = spawnSync("npm", ["pack", "--dry-run", "--json"], {
        "cwd": ROOT
        , "encoding": "utf8"
    });
    return JSON.parse(ret.stdout)[0].files.map(item => item.path);
}

test("运行时缓存目录不进 npm 包", () => {
    // dist/.temp 是 enableCache 打开后写缓存的地方, 就在 dist 里面, 而 files
    // 白名单收的是整个 dist。发布者本机跑过一次带缓存的项目, 那份缓存就会被
    // 打进包里, 泄漏本机绝对路径; 且 v1.2.3 的 getFromCache 不校验 cwd,
    // 使用方装上后会直接采用发布者机器的扫描结果
    const files = packedFiles();
    const leaked = files.filter(p => p.includes(".temp"));

    assert.deepStrictEqual(leaked, [], "dist/.temp 不应出现在发布内容里");
});

test("发布内容只含 dist 与 @types, 不含源码与测试", () => {
    const tops = new Set(packedFiles().map(p => p.split("/")[0]));

    assert.ok(tops.has("dist"), "缺 dist");
    assert.ok(tops.has("@types"), "缺 @types");
    ["test", "src", "example", "temp", ".claude", "docs"].forEach(dir => {
        assert.ok(!tops.has(dir), `${dir} 不该被打进包里`);
    });
});

test("bin 入口在发布内容里", () => {
    assert.ok(
        packedFiles().indexOf("dist/bin/launch") !== -1
        , "dist/bin/launch 缺失会导致 xlaunch 命令不可用"
    );
});
