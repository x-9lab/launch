const { test, after } = require("node:test");
const assert = require("node:assert");

const { makeFixture, addSymlinkPackage, addStrayFile, cleanFixture, pkg } = require("./helpers/fixture");
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

test("缺少 package.json 的目录给出告警, 不再静默", () => {
    const root = fixture({
        "a-first": pkg("@t/a", 1)
        , "b-broken": null
    });

    const result = scanIn(root);

    assert.match(result.stdout, /跳过 b-broken: 未找到 package.json/);
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
