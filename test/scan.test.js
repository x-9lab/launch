const { test, after } = require("node:test");
const assert = require("node:assert");

const { makeFixture, addManifest, addSymlinkPackage, addStrayFile, cleanFixture, pkg } = require("./helpers/fixture");
const { scanIn, dirNames } = require("./helpers/scan-in-child");

/**用完统一清理 */
const fixtures = [];
function fixture(packages) {
    const root = makeFixture(packages);
    fixtures.push(root);
    return root;
}
after(() => fixtures.forEach(cleanFixture));

test("单个包缺少 package.json 不再中断整个扫描", () => {
    // 目录名顺序决定遍历顺序, b-broken 排在中间, 修复前会把 c / d 一起带走
    const root = fixture({
        "a-first": pkg("@t/a", 1)
        , "b-broken": null
        , "c-third": pkg("@t/c", 3)
        , "d-fourth": pkg("@t/d", 4)
    });

    const result = scanIn(root);

    assert.deepStrictEqual(
        dirNames(result)
        , ["a-first", "c-third", "d-fourth"]
        , "b-broken 之后的合法包必须仍被发现"
    );
});

test("没有任何清单的目录收敛成一行汇总告警", () => {
    // 一个清单都没有的目录多半是 packages/docs 这类非包目录, 逐个告警
    // 会变成每次启动的噪音
    const root = fixture({
        "a-first": pkg("@t/a", 1)
        , "b-nothing": null
        , "c-nothing": null
    });

    const result = scanIn(root);

    assert.match(result.stdout, /2 个目录没有可识别的清单, 已跳过: b-nothing, c-nothing/);
});

test("package.json 内容损坏时告警并跳过, 不影响其它包", () => {
    const root = fixture({
        "a-first": pkg("@t/a", 1)
        , "b-broken": null
        , "c-third": pkg("@t/c", 3)
    });
    require("fs").writeFileSync(
        require("path").join(root, "packages", "b-broken", "package.json")
        , "{ 这不是合法 JSON"
    );

    const result = scanIn(root);

    assert.deepStrictEqual(dirNames(result), ["a-first", "c-third"]);
    assert.match(result.stdout, /跳过 b-broken: package.json 解析失败/);
});

test("软链目录仍被识别为包", () => {
    const root = fixture({ "normal": pkg("@t/normal", 2) });
    addSymlinkPackage(root, "linked", pkg("@t/linked", 1));

    const result = scanIn(root);

    assert.deepStrictEqual(
        dirNames(result).sort()
        , ["linked", "normal"]
        , "isDirectory() 对软链返回 false, 必须一并放行 isSymbolicLink()"
    );
});

test("散落文件与点开头的文件被跳过且不告警", () => {
    const root = fixture({ "normal": pkg("@t/normal", 1) });
    addStrayFile(root, ".DS_Store");
    addStrayFile(root, "stray.txt");

    const result = scanIn(root);

    assert.deepStrictEqual(dirNames(result), ["normal"]);
    assert.doesNotMatch(result.stdout, /跳过 .DS_Store/);
    assert.doesNotMatch(result.stdout, /跳过 stray.txt/);
});

test("含点的合法目录名不再被误伤", () => {
    const root = fixture({ "v1.2-legacy": pkg("@t/legacy", 1) });

    const result = scanIn(root);

    assert.deepStrictEqual(dirNames(result), ["v1.2-legacy"]);
});

// 局限要说清楚: APFS 的 readdir 本身就返回字典序, 与创建顺序无关。所以在
// macOS 上把 scan() 里的 sort 整段删掉, 这条用例照样是绿的 —— 它只挡得住
// "排错序"(比如反序或换了比较器), 挡不住"没排序"。真正会暴露的是 ext4 /
// XFS 这类按 hash 返回的文件系统, 以及 CI。
test("遍历顺序为目录名字典序", () => {
    const root = fixture({
        "zeta": pkg("@t/z", 1)
        , "alpha": pkg("@t/a", 2)
        , "mike": pkg("@t/m", 3)
    });

    const result = scanIn(root);

    assert.deepStrictEqual(dirNames(result), ["alpha", "mike", "zeta"]);
});

test("sequence 为 -1 的包不纳入管理", () => {
    const root = fixture({
        "kept": pkg("@t/kept", 1)
        , "excluded": pkg("@t/excluded", -1)
    });

    const result = scanIn(root);

    assert.deepStrictEqual(dirNames(result), ["kept"]);
});

test("未声明 sequence 的包排到最后", () => {
    const root = fixture({
        "declared": pkg("@t/declared", 1)
        , "undeclared": pkg("@t/undeclared")
    });

    const result = scanIn(root);

    assert.deepStrictEqual(
        result.buildSequence
        , ["@t/declared", "@t/undeclared"]
        , "未声明 sequence 时填入 MAGIC_CODE, 排在所有显式声明之后"
    );
});

test("构建顺序按 sequence 排序, 与目录名顺序无关", () => {
    const root = fixture({
        "alpha": pkg("@t/alpha", 30)
        , "mike": pkg("@t/mike", 10)
        , "zeta": pkg("@t/zeta", 20)
    });

    const result = scanIn(root);

    assert.deepStrictEqual(dirNames(result), ["alpha", "mike", "zeta"]);
    assert.deepStrictEqual(
        result.buildSequence
        , ["@t/mike", "@t/zeta", "@t/alpha"]
    );
});

test("业务目录不存在时报错返回, 不抛异常", () => {
    const root = require("fs").mkdtempSync(
        require("path").join(require("os").tmpdir(), "xlaunch-empty-")
    );
    fixtures.push(root);

    const result = scanIn(root);

    assert.deepStrictEqual(dirNames(result), []);
    assert.match(result.stdout, /业务目录扫描失败/);
});

// —— 以下为 B-POLYGLOT-5 引入的多语言清单场景 ——

test("只有 pyproject.toml 的包能被发现", () => {
    const root = fixture({});
    addManifest(root, "py-pkg", "pyproject.toml", [
        "[project]"
        , 'name = "py-pkg"'
        , 'version = "2.0.0"'
        , 'description = "Python 包"'
        , ""
        , "[tool.xlaunch]"
        , "sequence = 3"
        , "isServices = true"
        , ""
        , "[tool.xlaunch.scripts]"
        , 'build = "echo py build"'
    ].join("\n"));

    const result = scanIn(root);
    const pack = result.packages["py-pkg"];

    assert.ok(pack, "应当被发现");
    assert.strictEqual(pack.value, "py-pkg");
    assert.strictEqual(pack.version, "2.0.0");
    assert.strictEqual(pack.index, 3);
    assert.strictEqual(pack.isServices, true);
    assert.strictEqual(pack.runner, "shell");
    assert.deepStrictEqual(pack.scripts, { "build": "echo py build" });
    assert.ok(pack.dir.endsWith("py-pkg"), "dir 要落到包目录, 执行层要用");
});

test("只有 Cargo.toml 的包能被发现", () => {
    const root = fixture({});
    addManifest(root, "rs-pkg", "Cargo.toml", [
        "[package]"
        , 'name = "rs-pkg"'
        , 'version = "0.3.0"'
        , 'description = "Rust 包"'
        , ""
        , "[package.metadata.xlaunch]"
        , "sequence = 4"
        , ""
        , "[package.metadata.xlaunch.scripts]"
        , 'build = "cargo build"'
    ].join("\n"));

    const result = scanIn(root);
    const pack = result.packages["rs-pkg"];

    assert.ok(pack);
    assert.strictEqual(pack.value, "rs-pkg");
    assert.strictEqual(pack.index, 4);
    assert.strictEqual(pack.runner, "shell");
    assert.deepStrictEqual(pack.scripts, { "build": "cargo build" });
});

test("package.json 与语言清单并存时走 package.json", () => {
    // 对应现有带 shim package.json 的包: 行为必须一字不变, 删掉 shim 才切换
    const root = fixture({ "mixed": pkg("@t/from-node", 1) });
    addManifest(root, "mixed", "pyproject.toml", [
        "[project]"
        , 'name = "from-python"'
        , 'version = "9.9.9"'
        , 'description = "不该看到这个"'
    ].join("\n"));

    const result = scanIn(root);

    assert.strictEqual(result.packages["mixed"].value, "@t/from-node");
    assert.strictEqual(result.packages["mixed"].runner, "yarn-workspace");
});

test("纯 JS 包仍然是 yarn-workspace", () => {
    const root = fixture({ "js-pkg": pkg("@t/js", 1) });

    assert.strictEqual(scanIn(root).packages["js-pkg"].runner, "yarn-workspace");
});

test("跨语言按 sequence 统一排序", () => {
    const root = fixture({ "js-mid": pkg("@t/js", 5) });
    addManifest(root, "py-first", "pyproject.toml"
        , '[project]\nname = "py-first"\nversion = "1.0.0"\n\n[tool.xlaunch]\nsequence = 0\n');
    addManifest(root, "rs-last", "Cargo.toml"
        , '[package]\nname = "rs-last"\nversion = "1.0.0"\n\n[package.metadata.xlaunch]\nsequence = 9\n');

    const result = scanIn(root);

    assert.deepStrictEqual(
        result.buildSequence
        , ["py-first", "@t/js", "rs-last"]
        , "Python 包排在 JS 包之前才真正证明了跨语言排序"
    );
});

test("Cargo workspace 根目录报出找到了什么, 而不是笼统说没清单", () => {
    // 只有 [workspace] 没有 [package]。文件明明在那儿, 笼统报"没有清单"
    // 会让人一头雾水
    const root = fixture({});
    addManifest(root, "rs-workspace", "Cargo.toml", '[workspace]\nmembers = ["crates/*"]\n');

    const result = scanIn(root);

    assert.deepStrictEqual(Object.keys(result.packages), []);
    assert.match(result.stdout, /跳过 rs-workspace: 找到 Cargo.toml 但没有可用的包声明/);
});

test("清单损坏时报出是哪个文件坏了, 且不降级去读下一个清单", () => {
    const root = fixture({});
    addManifest(root, "broken", "package.json", "{ 这不是 JSON");
    addManifest(root, "broken", "pyproject.toml"
        , '[project]\nname = "不该被读到"\nversion = "1.0.0"\n');

    const result = scanIn(root);

    assert.deepStrictEqual(Object.keys(result.packages), []);
    assert.match(result.stdout, /跳过 broken: package.json 解析失败/);
});

test("两个目录声明同一个包名时告警", () => {
    // Packages 以目录名为键而菜单传的是包名, 重名时后者永远反查不到
    const root = fixture({
        "dir-one": pkg("@t/dup", 1)
        , "dir-two": pkg("@t/dup", 2)
    });

    const result = scanIn(root);

    assert.match(result.stdout, /dir-two 与 dir-one 声明了同一个包名 @t\/dup/);
});

test("pyproject 里 sequence 为 -1 同样不纳入管理", () => {
    const root = fixture({ "kept": pkg("@t/kept", 1) });
    addManifest(root, "excluded", "pyproject.toml"
        , '[project]\nname = "excluded"\nversion = "1.0.0"\n\n[tool.xlaunch]\nsequence = -1\n');

    assert.deepStrictEqual(Object.keys(scanIn(root).packages), ["kept"]);
});
