import { copy, isAsyncFunction, isExecutable, isObject, isUndefined, merge } from "@x-drive/utils";
import { checkFileStat, spawn, walk } from "./helper";
import type { IPack, IPackages } from "./helper";
import { EXIT_PACK, MAGIC_CODE } from "./consts";
import sysBoot from "./@inquirer/sys-boot";
import build from "./@inquirer/build";
import start from "./@inquirer/start";
import patch from "./@inquirer/patch";
import dev from "./@inquirer/dev";
import inquirer from "inquirer";
import path from "path";
import fs from "fs";


/**配置项 */
interface LaunchConfig {
    /**Launch 扩展目录名 */
    scriptDirName?: string;

    /**交互菜单目录名称 */
    inquirerDirName?: string;

    /**执行目录 */
    cwd?: string;

    /**启动 Logo 输出文件名 */
    wellcomFileName?: string;

    /**环境启动命令在根目录 */
    startAtRoot?: boolean | Record<string, boolean>;

    /**显示启动 debug 环境 */
    showStartDebugEnv?: boolean;
}
export type { LaunchConfig }

/**菜单项 */
interface MenuItem {
    /**菜单标题 */
    name: string;

    /**操作值 */
    value: ModeTypes | string;
}
export type { MenuItem }

/**选项钩子 */
interface IHook {
    /**业务开始执行前 */
    onStart?: () => boolean;

    /**业务执行后 */
    onEnd?(): boolean;
}

type LaunchHooks = {
    [name: string]: IHook
}

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

const BuildSequence = Object.keys(Packages)
    .sort((now, next) => Packages[now].index - Packages[next].index)
    .map(key => Packages[key].value);

/**默认配置 */
const DefConfig: LaunchConfig = {
    "scriptDirName": "@launch"
    , "cwd": process.cwd()
    , "wellcomFileName": "version.js"
    , "inquirerDirName": "@inquirer"
    , "startAtRoot": false
    , "showStartDebugEnv": false
}

/**实例启动状态 */
const LaunchStatusSymbol = Symbol("status");

const HeartbreakEmoji = "💔";

const Inquirers = {
    /**代码打包 */
    build
    /**环境启动 */
    , start
    /**打补丁 */
    , patch
    /**代码开发 */
    , dev
    /**初始化项目 */
    , sysBoot
}

class Launch {

    /**配置项 */
    #config: LaunchConfig;

    /**一级选项菜单 */
    #menus: MenuItem[] = [
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
    ];

    /**现在已有的一级菜单 */
    #menusVal: string[];

    /**用户自定义菜单 */
    #customMenus: Record<string, XLaunchInquirerExport> = {};

    /**用户 launch 业务目录 */
    #scriptDir: string;

    /**钩子 */
    #menuHooks: LaunchHooks = {};

    /**spawn 模式执行一条命令 */
    spawn = spawn;

    /**实例启动状态 */
    private [LaunchStatusSymbol]: boolean = false;

    /**标准退出选项 */
    get EXIT_PACK() {
        return copy(EXIT_PACK);
    }

    constructor() {
        this.#menusVal = this.#menus.map(m => m.value);
    }

    /**主启动函数 */
    boot(conf?: LaunchConfig) {
        if (this[LaunchStatusSymbol]) {
            return this;
        }
        this[LaunchStatusSymbol] = true;
        if (isUndefined(this.#config)) {
            this.#config = copy(DefConfig);
        }
        if (isObject(conf)) {
            this.#config = merge({}, this.#config, conf);
        }
        this.#scriptDir = path.resolve(
            this.#config.cwd
            , this.#config.scriptDirName
        );
        this.#version()
            .#scan()
            .#fire();
        return this;
    }

    /**扫描相关文件夹 */
    #scan() {
        const inquirerPath = path.resolve(
            this.#scriptDir
            , this.#config.inquirerDirName
        );
        if (checkFileStat(inquirerPath)) {
            const errMsgs: string[] = [];
            walk(inquirerPath, 0, (filePath, fileName) => {
                var value = fileName.replace(".js", "");
                if (value !== "exit" && this.#menusVal.indexOf(value) === -1) {
                    const mod: XLaunchInquirerExport = require(filePath);
                    if (mod && isExecutable(mod.processor) && mod.name) {
                        this.#customMenus[value] = mod;
                        this.#menus.push({
                            "name": mod.name
                            , value
                        });
                        this.#menusVal.push(value);
                    }
                } else {
                    errMsgs.push(
                        (value === "exit"
                            ? `${fileName} 模块导出的选项值 exit 为模块保留值`
                            : `${fileName} 模块导出的选项值 ${value} 已存在`).yellow
                    );
                }
            });
            if (errMsgs.length) {
                console.log(
                    HeartbreakEmoji
                    , errMsgs.join("\n   ")
                );
                console.log(
                    "  "
                    , "当前已有选项值:", this.#menusVal.concat(["exit"]).join(", ").blue
                    , "\n"
                );
            }
        }
        return this;
    }

    /**启动主操作菜单 */
    #fire() {
        this.#menus.push({
            "name": "退出"
            , "value": ModeTypes.Exit
        });
        inquirer
            .prompt<Record<string, ModeTypes>>([{
                "type": "list"
                , "loop": false
                , "name": "mode"
                , "message": "运行模式 >> "
                , "choices": this.#menus
            }])
            .then(async answers => {
                let hooks = this.#menuHooks[answers.mode] || {};
                let { onStart, onEnd } = hooks;
                if (isExecutable(onStart)) {
                    onStart();
                }
                switch (answers.mode) {
                    case ModeTypes.Boot:
                        await Inquirers.sysBoot();
                        break;

                    case ModeTypes.Build:
                        await Inquirers.build(inquirer, Packages, BuildSequence);
                        break;

                    case ModeTypes.Start:
                        await Inquirers.start(inquirer, Packages);
                        break;

                    case ModeTypes.Patch:
                        await Inquirers.patch(inquirer);
                        break;

                    case ModeTypes.Dev:
                        await Inquirers.dev(inquirer, Packages);
                        break;

                    case ModeTypes.Exit:
                        process.exit(0);
                        break;

                    default:
                        let customMenus = this.#customMenus[answers.mode]
                        if (customMenus) {
                            await customMenus.processor(inquirer, Packages, BuildSequence);
                        } else {
                            process.exit(0);
                        }
                }
                if (isExecutable(onEnd)) {
                    onEnd();
                }
                hooks = null;
            });
    }

    /**显示 LOGO 及版本 */
    #version() {
        if (this.#config.wellcomFileName) {
            try {
                const versionPath = path.resolve(
                    this.#scriptDir
                    , this.#config.wellcomFileName
                );
                fs.statSync(versionPath);
                const version = require(versionPath);
                version();
            } catch (e) {
                console.log(`🤔 启动 Logo 输出文件 ${this.#config.wellcomFileName.bold} 不存在`.yellow);
                console.log("   如不希望显示启动 Logo, 可将", "wellcomFileName".bold, "设为 null");
            }
        }
        return this;
    }

    /**
     * 加载项目配置控制文件
     * @param confPath 配置文件地址
     */
    loadConfig(confPath: string) {
        if (checkFileStat(confPath)) {
            let conf = require(confPath);
            this.#config = merge({}, DefConfig, conf);
        }
        return this;
    }

    /**设置钩子 */
    hooks(setting: LaunchHooks) {
        if (isObject(setting)) {
            Object.keys(setting).forEach(key => {
                const hook = setting[key];
                if (isExecutable(hook.onEnd) || isExecutable(hook.onStart)) {
                    this.#menuHooks[key] = setting[key];
                }
            });
        }
    }

    /**获取配置 */
    getConfig<K extends keyof LaunchConfig>(key: K) {
        return copy(this.#config[key]);
    }
}

export { Launch }

const XLaunch = new Launch();

export { XLaunch }