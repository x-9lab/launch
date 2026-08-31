const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const DIST = path.resolve(__dirname, "..", "..", "dist");

/**去掉 ANSI 转义, 告警文本里 colors.bold 会把包名包起来 */
function stripAnsi(text) {
    // eslint-disable-next-line no-control-regex
    return String(text).replace(
        new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g")
        , ""
    );
}

/**
 * 在子进程里以指定 cwd 跑一次完整启动, 回传扫描结果与终端输出
 *
 * 为什么必须子进程: BasePath 是模块级常量, 在 require dist/launch.js 时就
 * 从 process.cwd() 求值定死, 同一进程内无法换夹具。
 *
 * 为什么读 registry 而不是 scan.onEnd 钩子: saveToCache 在 onEnd 之后才执行,
 * 在钩子里退出会导致缓存路径永远测不到。boot() 里的 #fire() 只是启动 prompt
 * 就返回, 所以 boot() 返回后扫描与缓存都已完成。
 *
 * @param  cwd  夹具根目录
 * @param  conf 传给 boot() 的配置
 * @return { packages, buildSequence, stdout }
 */
function scanIn(cwd, conf = {}) {
    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), "xlaunch-out-"))
        , "result.json"
    );

    const code = [
        `const fs = require("fs");`
        , `require(${JSON.stringify(path.join(DIST, "index.js"))});`
        , `xlaunch.boot(Object.assign({ "wellcomFileName": null }, ${JSON.stringify(conf)}));`
        , `const reg = require(${JSON.stringify(path.join(DIST, "registry.js"))});`
        , `fs.writeFileSync(${JSON.stringify(outFile)}, JSON.stringify({`
        , `    "packages": reg.getPackages()`
        , `    , "buildSequence": reg.getBuildSequence()`
        , `}));`
        , `process.exit(0);`
    ].join("\n");

    const ret = spawnSync(process.execPath, ["-e", code], {
        "cwd": cwd
        , "encoding": "utf8"
        // 子进程里 #fire() 会启动 prompt, 给个不可读的 stdin 让它立刻结束
        , "stdio": ["ignore", "pipe", "pipe"]
    });

    const result = JSON.parse(fs.readFileSync(outFile, "utf8"));
    fs.rmSync(path.dirname(outFile), { "force": true, "recursive": true });

    return {
        "packages": result.packages
        , "buildSequence": result.buildSequence
        , "stdout": stripAnsi(ret.stdout) + stripAnsi(ret.stderr)
    };
}

/**扫描结果里的业务目录名, 按插入顺序 */
function dirNames(result) {
    return Object.keys(result.packages);
}

module.exports = { scanIn, dirNames, stripAnsi };
