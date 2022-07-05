import type { IPack, IPackages } from "./helper";
import sysBoot from "./@inquirer/sys-boot";
import { merge } from "@x-drive/utils";
import build from "./@inquirer/build";
import start from "./@inquirer/start";
import { MAGIC_CODE } from "./consts";
import patch from "./@inquirer/patch";
import dev from "./@inquirer/dev";
import inquirer from "inquirer";
import path from "path";
import fs from "fs";
import "colors";

interface LaunchConfig {
    /**Launch 扩展目录名 */
    scriptDirName?: string;

    /**执行目录 */
    cwd?: string;

    /**启动 Logo 输出文件名 */
    wellcomFileName?: string;
}

export type { LaunchConfig }

/**运行模式 */
enum ModeTypes {
    /**代码开发 */
    Dev = "dev"

    /**环境启动 */
    , Start = "start"

    /**代码打包 */
    , Build = "build"

    /**初始化项目 */
    , Boot = "boot"

    /**打补丁 */
    , Patch = "patch"

    /**退出 */
    , Exit = "exit"
}

const DefConfig: LaunchConfig = {
    "scriptDirName": "@launch"
    , "cwd": process.cwd()
    , "wellcomFileName": "version.js"
}

var scriptDir: string;

/**已有的包 */
const Packages: IPackages = {};
const BasePath = path.resolve(
    process.cwd()
    , "packages"
);

try {
    fs.readdirSync(BasePath).forEach(name => {
        try {
            const meta = require(`${BasePath}/${name}/package.json`);
            if (meta.sequence !== -1) {
                const pack: IPack = {
                    "name": `${name.replace(/^[a-z]/, m => m.toUpperCase())}: ${meta.description}`
                    , "value": meta.name
                    , "index": meta.sequence === undefined ? MAGIC_CODE : meta.sequence
                    , "version": meta.version
                    , "isServices": meta.isServices
                };
                Packages[name] = pack;
            }
        } catch (e) {
            console.log(e);
        }
    });
} catch (e) {
    console.log(e);
}

/**运行模式 */
const Modes = [
    {
        "name": "代码开发"
        , "value": ModeTypes.Dev
    }
    , {
        "name": "环境启动"
        , "value": ModeTypes.Start
    }
    , {
        "name": "代码打包"
        , "value": ModeTypes.Build
    }
    , {
        "name": "初始化项目"
        , "value": ModeTypes.Boot
    }
    , {
        "name": "打补丁"
        , "value": ModeTypes.Patch
    }
    , {
        "name": "退出"
        , "value": ModeTypes.Exit
    }
];

const BuildSequence = Object.keys(Packages)
    .sort((now, next) => Packages[now].index - Packages[next].index)
    .map(key => Packages[key].value);

/**选择运行模式 */
function mode() {
    inquirer
        .prompt<Record<string, ModeTypes>>([{
            "type": "list"
            , "loop": false
            , "name": "mode"
            , "message": "运行模式 >> "
            , "choices": Modes
        }])
        .then(answers => {
            switch (answers.mode) {
                case ModeTypes.Boot:
                    sysBoot();
                    break;

                case ModeTypes.Build:
                    build(inquirer, Packages, BuildSequence);
                    break;

                case ModeTypes.Start:
                    start(inquirer, Packages);
                    break;

                case ModeTypes.Patch:
                    patch(inquirer);
                    break;

                case ModeTypes.Dev:
                    dev(inquirer, Packages);
                    break;

                case ModeTypes.Exit:
                    process.exit(0);
                    break;

                default:
                    process.exit(0);

            }
        });
}

/**启动函数 */
function boot(conf: LaunchConfig = {}) {
    const config: LaunchConfig = merge({}, DefConfig, conf);
    scriptDir = path.resolve(
        config.cwd
        , config.scriptDirName
    );
    if (config.wellcomFileName) {
        try {
            const versionPath = path.resolve(
                scriptDir
                , config.wellcomFileName
            );
            fs.statSync(versionPath);
            const version = require(versionPath);
            version();
        } catch (e) {
            console.log(`🤔 启动 Logo 输出文件 ${config.wellcomFileName.bold} 不存在`.yellow);
            console.log("   如不希望显示启动 Logo, 可将", "wellcomFileName".bold, "设为 null");
        }
    }
    mode();
}

export default boot;

if (require.main === module) {
    boot();
}