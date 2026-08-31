const path = require("path");
const os = require("os");
const fs = require("fs");

/**
 * 在系统临时目录里造一个 monorepo 夹具
 *
 * scan() 用的 BasePath 是模块级常量, require 时就从 process.cwd() 定死了,
 * 所以夹具必须配合子进程使用, 见 scan-in-child.js
 *
 * @param  packages 包声明。键为业务目录名, 值为 package.json 内容;
 *                  值为 null 表示只建目录、不放 package.json
 * @return 夹具根目录绝对路径
 */
function makeFixture(packages) {
    const root = fs.mkdtempSync(
        path.join(os.tmpdir(), "xlaunch-test-")
    );
    fs.mkdirSync(path.join(root, "packages"));

    Object.keys(packages).forEach(dirName => {
        const dir = path.join(root, "packages", dirName);
        fs.mkdirSync(dir);
        if (packages[dirName] !== null) {
            fs.writeFileSync(
                path.join(dir, "package.json")
                , JSON.stringify(packages[dirName], null, 4)
            );
        }
    });

    return root;
}

/**
 * 往夹具的某个包目录里写一个清单文件
 * @param root    夹具根目录
 * @param dirName 业务目录名, 不存在则创建
 * @param file    清单文件名
 * @param content 文件内容
 */
function addManifest(root, dirName, file, content) {
    const dir = path.join(root, "packages", dirName);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { "recursive": true });
    }
    fs.writeFileSync(path.join(dir, file), content);
}

/**
 * 往夹具里加一个软链目录, 链接目标放在 packages 之外
 * @param root 夹具根目录
 * @param name packages 下的软链名
 * @param meta 被链接目标的 package.json 内容
 */
function addSymlinkPackage(root, name, meta) {
    const target = path.join(root, `${name}-target`);
    fs.mkdirSync(target);
    fs.writeFileSync(
        path.join(target, "package.json")
        , JSON.stringify(meta, null, 4)
    );
    fs.symlinkSync(
        path.join("..", `${name}-target`)
        , path.join(root, "packages", name)
    );
}

/**
 * 往夹具的 packages 下丢一个普通文件
 * @param root 夹具根目录
 * @param name 文件名
 */
function addStrayFile(root, name) {
    fs.writeFileSync(
        path.join(root, "packages", name)
        , "不是包, 应当被跳过\n"
    );
}

/**清理夹具 */
function cleanFixture(root) {
    fs.rmSync(root, { "force": true, "recursive": true });
}

/**
 * 造一个最简包元信息
 * @param name     包名
 * @param sequence 编译顺序
 */
function pkg(name, sequence) {
    const meta = {
        "name": name
        , "version": "1.0.0"
        , "description": `测试包 ${name}`
        , "scripts": {
            "build": `echo ${name} build`
        }
    };
    if (sequence !== undefined) {
        meta.sequence = sequence;
    }
    return meta;
}

module.exports = {
    makeFixture
    , addManifest
    , addSymlinkPackage
    , addStrayFile
    , cleanFixture
    , pkg
};
