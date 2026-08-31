const { test } = require("node:test");
const assert = require("node:assert");

const { nodeAdapter, pythonAdapter, rustAdapter, ADAPTERS } = require("../dist/manifest.js");

/**适配器是纯函数, 直接喂文本即可, 不需要碰文件系统 */
function parse(adapter, text) {
    return adapter.parse(text, "/tmp/fake-dir");
}

test("优先级为 package.json -> pyproject.toml -> Cargo.toml", () => {
    assert.deepStrictEqual(
        ADAPTERS.map(a => a.file)
        , ["package.json", "pyproject.toml", "Cargo.toml"]
        , "package.json 必须排最前: 现有带 shim 的包行为要一字不变"
    );
});

test("package.json: 字段取顶层, runner 为 yarn-workspace", () => {
    const { manifest, raw } = parse(nodeAdapter, JSON.stringify({
        "name": "@t/a"
        , "version": "1.2.3"
        , "description": "测试包"
        , "sequence": 5
        , "isServices": true
        , "scripts": { "build": "tsc" }
    }));

    assert.strictEqual(manifest.name, "@t/a");
    assert.strictEqual(manifest.version, "1.2.3");
    assert.strictEqual(manifest.sequence, 5);
    assert.strictEqual(manifest.isServices, true);
    assert.strictEqual(manifest.isStatic, false);
    assert.deepStrictEqual(manifest.scripts, { "build": "tsc" });
    assert.strictEqual(manifest.runner, "yarn-workspace");
    assert.strictEqual(raw.name, "@t/a", "raw 应是解析后的原始清单, 供 scan 钩子使用");
});

test("package.json: 没有 name 视为不适用", () => {
    assert.strictEqual(parse(nodeAdapter, JSON.stringify({ "version": "1.0.0" })), null);
});

test("package.json: 内容损坏时抛异常而不是返回 null", () => {
    // null 表示"不适用, 继续试下一个"; 抛异常表示"文件在但坏了"。
    // 一个坏掉的 package.json 不该悄悄降级去读 pyproject.toml
    assert.throws(() => parse(nodeAdapter, "{ 这不是 JSON"));
});

test("pyproject.toml: 元数据取 [project], 配置取 [tool.xlaunch]", () => {
    const { manifest } = parse(pythonAdapter, `
[project]
name = "gaia-flywheel"
version = "1.0.1"
description = "质量自省飞轮"

[tool.xlaunch]
sequence = 20
isServices = true

[tool.xlaunch.scripts]
build = "docker build -t gaia-flywheel ."
"start-dev" = ".venv/bin/flywheel-service"
`);

    assert.strictEqual(manifest.name, "gaia-flywheel");
    assert.strictEqual(manifest.version, "1.0.1", "版本号只从 [project] 取, 不需要双写");
    assert.strictEqual(manifest.description, "质量自省飞轮");
    assert.strictEqual(manifest.sequence, 20);
    assert.strictEqual(manifest.isServices, true);
    assert.strictEqual(manifest.scripts["start-dev"], ".venv/bin/flywheel-service");
    assert.strictEqual(manifest.runner, "shell");
});

test("pyproject.toml: 没有 [tool.xlaunch] 也能用", () => {
    const { manifest } = parse(pythonAdapter, `
[project]
name = "plain"
version = "0.1.0"
`);

    assert.strictEqual(manifest.name, "plain");
    assert.strictEqual(manifest.sequence, undefined, "未声明 sequence, 由 scan 填 MAGIC_CODE");
    assert.deepStrictEqual(manifest.scripts, {});
});

test("pyproject.toml: 不是 Python 项目清单时视为不适用", () => {
    // 只有 [build-system] 的 pyproject 不声明包, 应继续试下一个适配器
    assert.strictEqual(
        parse(pythonAdapter, "[build-system]\nrequires = [\"setuptools\"]\n")
        , null
    );
});

test("Cargo.toml: 元数据取 [package], 配置取 [package.metadata.xlaunch]", () => {
    const { manifest } = parse(rustAdapter, `
[package]
name = "example-g-rust"
version = "0.1.0"
description = "测试包 G"

[package.metadata.xlaunch]
sequence = 5
isStatic = true

[package.metadata.xlaunch.scripts]
build = "cargo build --release"
`);

    assert.strictEqual(manifest.name, "example-g-rust");
    assert.strictEqual(manifest.version, "0.1.0");
    assert.strictEqual(manifest.description, "测试包 G");
    assert.strictEqual(manifest.sequence, 5);
    assert.strictEqual(manifest.isStatic, true);
    assert.strictEqual(manifest.scripts.build, "cargo build --release");
    assert.strictEqual(manifest.runner, "shell");
});

test("Cargo.toml: workspace 根目录视为不适用", () => {
    // 只有 [workspace] 没有 [package]。返回 null 而不是抛异常, 由 scan 报
    // "找到清单但没有可用的包声明", 不在适配器里特判
    assert.strictEqual(
        parse(rustAdapter, "[workspace]\nmembers = [\"crates/*\"]\n")
        , null
    );
});

test("xlaunch 配置段可以覆盖生态清单里的字段", () => {
    const { manifest } = parse(pythonAdapter, `
[project]
name = "real-name"
version = "1.0.0"
description = "生态里的描述"

[tool.xlaunch]
name = "菜单里想显示的名字"
description = "菜单里想显示的描述"
`);

    assert.strictEqual(manifest.name, "菜单里想显示的名字");
    assert.strictEqual(manifest.description, "菜单里想显示的描述");
    assert.strictEqual(manifest.version, "1.0.0", "版本号不允许覆盖, 只有一处来源");
});
