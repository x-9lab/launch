import { copy, isBoolean, isExecutable, isObject, isUndefined, merge } from "@x-drive/utils";
import { genBuildSequence, getBuildSequence, getPackages, setBuildSequence, setPack, setPackages } from "./registry";
import { checkFileStat, spawn, walk, colors, SpawnError } from "./helper";
import { resolveManifest } from "./manifest";
import type { IPack, IPackages } from "./helper";
import { EXIT_PACK, MAGIC_CODE } from "./consts";
import sysBoot from "./@inquirer/sys-boot";
import build from "./@inquirer/build";
import start from "./@inquirer/start";
import patch from "./@inquirer/patch";
import path, { join } from "path";
import dev from "./@inquirer/dev";
import inquirer from "inquirer";
import fs from "fs";

/**菜单项 */
interface MenuItem {
    /**菜单标题 */
    name: string;

    /**操作值 */
    value: ModeTypes | string;
}
export type { MenuItem }

/**内置菜单 */
type BuildInLaunchMenus = ModeTypes | string;

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

    /**要屏蔽的菜单 */
    ignoreMenus?: Record<BuildInLaunchMenus, boolean> | boolean;

    /**
     * 是否开启模块缓存
     *
     * 该功能可以加快命令启动速度，但新增业务模块或修改菜单功能时需要执行一次更新命令
     */
    enableCache?: boolean;
}
export type { LaunchConfig }

/**选项钩子 */
interface IHook {
    /**业务开始执行前 */
    onStart?: () => boolean;

    /**业务执行后 */
    onEnd?(): boolean;

    /**处理中 */
    onProcessing?: () => boolean;
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

/**菜单有效性 */
enum MenuAvailability {
    Ignore = -1
    , ExistOrExit
    , Valid
}

const BasePath = path.resolve(
    process.cwd()
    , "packages"
);

/**默认扫描数据处理函数 */
function defScanProcessor(pkg: IPack) {
    return pkg;
}

/**扫描业务目录 */
function scan(processor: Function = defScanProcessor) {
    var entries: fs.Dirent[];
    // 读不到业务目录是致命的, 与单个包读取失败不同, 直接报错返回
    try {
        entries = fs.readdirSync(BasePath, { "withFileTypes": true });
    } catch (e) {
        console.log(
            colors.red(`✗ 业务目录扫描失败: ${BasePath}`)
        );
        console.log(e);
        return;
    }

    // readdirSync 的返回顺序由文件系统决定, 排序保证扫描与菜单顺序跨机器一致
    entries.sort((now, next) => {
        if (now.name === next.name) {
            return 0;
        }
        return now.name < next.name ? -1 : 1;
    });

    // 一个清单文件都没有的目录, 多半是 packages/docs 这类非包目录, 逐个告警
    // 只会变成每次启动的噪音, 收敛成一行汇总
    const noManifest: string[] = [];
    // 包名 -> 业务目录名, 用于发现重名。
    // 用 Object.create(null) 而不是字面量: 包名可能撞上 Object.prototype 的键
    // (constructor / toString 之类), 那样会被误判成重名
    const claimed: Record<string, string> = Object.create(null);

    for (const entry of entries) {
        // 软链目录在 monorepo 里并不罕见, isDirectory() 对它返回 false, 需要一并放行
        if (!entry.isDirectory() && !entry.isSymbolicLink()) {
            continue;
        }
        const name = entry.name;
        if (name.startsWith(".")) {
            continue;
        }

        const result = resolveManifest(path.join(BasePath, name));

        if (result.error) {
            // 文件在但坏了, 是可操作的错误, 逐个报并附上异常
            console.log(
                colors.red(`⚠️  跳过 ${colors.bold(name)}: ${result.errorFile} 解析失败`)
            );
            console.log(result.error);
            continue;
        }

        if (!result.parsed) {
            if (result.found.length) {
                // 找到清单却读不出来, 最常见的是 Cargo workspace 根目录
                // (只有 [workspace] 没有 [package])。说清找到了什么, 便于排查
                console.log(
                    colors.yellow(
                        `⚠️  跳过 ${colors.bold(name)}: 找到 ${result.found.join(" / ")} `
                        + `但没有可用的包声明`
                    )
                );
            } else {
                noManifest.push(name);
            }
            continue;
        }

        const manifest = result.parsed.manifest;
        if (manifest.sequence === -1) {
            continue;
        }

        if (claimed[manifest.name]) {
            // Packages 以目录名为键而菜单传的是包名, 重名时后者永远反查不到
            console.log(
                colors.yellow(
                    `⚠️  ${colors.bold(name)} 与 ${colors.bold(claimed[manifest.name])} `
                    + `声明了同一个包名 ${colors.bold(manifest.name)}, 后者将无法被单独操作`
                )
            );
        } else {
            claimed[manifest.name] = name;
        }

        const pack: IPack = {
            "name": `${name.replace(/^[a-z]/, m => m.toUpperCase())}: ${manifest.description}`
            , "value": manifest.name
            , "index": manifest.sequence === undefined ? MAGIC_CODE : manifest.sequence
            , "version": manifest.version
            , "isServices": Boolean(manifest.isServices)
            , "isStatic": Boolean(manifest.isStatic)
            , "dir": manifest.dir
            , "runner": manifest.runner
            , "scripts": manifest.scripts
        };
        // 第二个参数保持"解析后的原始清单对象", 兼容现有 onProcessing 钩子
        // 用户钩子忘记 return 时兜底, 避免整个包变成 undefined
        setPack(name, processor(pack, result.parsed.raw) || pack);
    }

    if (noManifest.length) {
        console.log(
            colors.yellow(
                `⚠️  ${noManifest.length} 个目录没有可识别的清单, 已跳过: `
                + noManifest.join(", ")
            )
        );
    }
}

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

/**自定义菜单文件名 */
type CustomInquirerName = string;

/**自定义菜单模块地址 */
type CustomInquirerPath = string;

/**
 * 缓存结构版本
 *
 * 缓存的是扫描结果的结构。结构一变就必须 bump, 否则老缓存会产生残缺菜单。
 */
const CACHE_SCHEMA = 2;

interface ICache {
    /**缓存结构版本 */
    schema: number;

    /**产出这份缓存时的执行目录 */
    cwd: string;

    /**业务包 */
    packages: IPackages;

    /**构建顺序 */
    buildSequence: string[];

    /**用户自定义包信息 */
    customs: Record<CustomInquirerName, CustomInquirerPath>;
}

/**缓存文件地址 */
function cacheFile() {
    return join(__dirname, ".temp", "xlaunch.cache.json");
}

/**
 * 获取缓存数据
 *
 * 缓存写在**已安装包自身的 dist/.temp/ 里**, 不在宿主项目里, 文件本身不带
 * 任何来源标识。所以除了 schema, 还要校验 cwd —— 否则同一份安装在不同项目
 * 下运行会互相污染。
 */
function getFromCache(enable: boolean) {
    var data: ICache = null;
    if (enable) {
        const filePath = cacheFile();
        if (checkFileStat(filePath)) {
            data = require(filePath);
        }
    }
    if (data && (data.schema !== CACHE_SCHEMA || data.cwd !== process.cwd())) {
        return null;
    }
    return data;
}

/**保存缓存数据 */
function saveToCache(data: Omit<ICache, "schema" | "cwd">) {
    const dirPath = join(__dirname, ".temp");
    try {
        if (!checkFileStat(dirPath)) {
            fs.mkdirSync(dirPath, { "recursive": true });
        }
        fs.writeFileSync(
            cacheFile()
            , JSON.stringify(
                Object.assign(
                    {
                        "schema": CACHE_SCHEMA
                        , "cwd": process.cwd()
                    }
                    , data
                )
                , null
                , 4
            )
        );
    } catch (e) {
        console.log(
            HeartbreakEmoji
            , colors.red(e.message)
        );
        console.log(e);
    }
}

/**清理缓存文件 */
function cleanCache() {
    const filePath = join(__dirname, ".temp", "xlaunch.cache.json");
    if (checkFileStat(filePath)) {
        try {
            fs.rmSync(
                join(__dirname, ".temp")
                , {
                    "force": true
                    , "recursive": true
                }
            );
        } catch (e) {
            console.log(
                HeartbreakEmoji
                , colors.red(e.message)
            );
        }
    }
    console.log("🧹", "缓存清理完成");
}
export { cleanCache }


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

    /**检查菜单有效性 */
    #checkInquirerAvailability(name: string) {
        const { ignoreMenus } = this.#config;
        if (name === "exit") {
            return MenuAvailability.ExistOrExit;
        }

        if (this.#menusVal.indexOf(name) !== -1) {
            return MenuAvailability.ExistOrExit;
        }

        if (isObject(ignoreMenus)) {
            return ignoreMenus[name] ? MenuAvailability.Ignore : MenuAvailability.Valid;
        }

        return 1;
    }

    /**扫描相关文件夹 */
    #scan() {
        const { enableCache } = this.#config;
        const cache = getFromCache(enableCache);
        const customs: Record<CustomInquirerName, CustomInquirerPath> = {};
        var hasCache: boolean = false;
        if (cache) {
            hasCache = true;
        } else if (!enableCache || !cache) {
            let hooks = this.#menuHooks.scan || {};
            let { onEnd, onProcessing } = hooks;
            scan(onProcessing);
            if (isExecutable(onEnd)) {
                onEnd.call(this, getPackages());
            }
            genBuildSequence();
        }
        if (hasCache) {
            this.#startFromCache(cache);
            return this;
        }
        const inquirerPath = path.resolve(
            this.#scriptDir
            , this.#config.inquirerDirName
        );
        if (checkFileStat(inquirerPath)) {
            const errMsgs: string[] = [];
            walk(inquirerPath, 0, (filePath, fileName) => {
                var value = fileName.replace(".js", "");
                const availability = this.#checkInquirerAvailability(value);
                if (availability === MenuAvailability.Valid) {
                    const mod: XLaunchInquirerExport = require(filePath);
                    if (mod && isExecutable(mod.processor) && mod.name) {
                        if (enableCache) {
                            customs[value] = filePath;
                        }
                        this.#customMenus[value] = mod;
                        this.#menus.push({
                            "name": mod.name
                            , value
                        });
                        this.#menusVal.push(value);
                    }
                } else {
                    if (availability === MenuAvailability.ExistOrExit) {
                        errMsgs.push(
                            colors.yellow(
                                value === "exit"
                                    ? `${fileName} 模块导出的选项值 exit 为模块保留值`
                                    : `${fileName} 模块导出的选项值 ${value} 已存在`
                            )
                        );
                    }
                }
            });
            if (errMsgs.length) {
                console.log(
                    HeartbreakEmoji
                    , errMsgs.join("\n   ")
                );
                console.log(
                    "  "
                    , "当前已有选项值:", colors.blue(
                        this.#menusVal.concat(["exit"]).join(", ")
                    )
                    , "\n"
                );
            }
        }
        if (enableCache) {
            saveToCache({
                "buildSequence": getBuildSequence()
                , "packages": getPackages()
                , customs
            });
        }
        return this;
    }

    /**从缓存启动 */
    #startFromCache(cache: ICache) {
        setBuildSequence(cache.buildSequence);
        setPackages(cache.packages);
        Object.keys(cache.customs).forEach(value => {
            const filePath = cache.customs[value];
            const mod: XLaunchInquirerExport = require(filePath);
            if (mod && isExecutable(mod.processor) && mod.name) {
                this.#customMenus[value] = mod;
                this.#menus.push({
                    "name": mod.name
                    , value
                });
                this.#menusVal.push(value);
            }
        });
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
                        await Inquirers.build(inquirer, getPackages(), getBuildSequence());
                        break;

                    case ModeTypes.Start:
                        await Inquirers.start(
                            inquirer
                            , getPackages()
                            , {
                                "startAtRoot": this.#config.startAtRoot
                                , "showStartDebugEnv": this.#config.showStartDebugEnv
                            }
                        );
                        break;

                    case ModeTypes.Patch:
                        await Inquirers.patch(inquirer);
                        break;

                    case ModeTypes.Dev:
                        await Inquirers.dev(inquirer, getPackages());
                        break;

                    case ModeTypes.Exit:
                        process.exit(0);
                        break;

                    default:
                        let customMenus = this.#customMenus[answers.mode]
                        if (customMenus) {
                            await customMenus.processor(inquirer, getPackages(), getBuildSequence());
                        } else {
                            process.exit(0);
                        }
                }
                if (isExecutable(onEnd)) {
                    onEnd();
                }
                hooks = null;
            })
            .catch(e => {
                if (e.message && (e.message as string).startsWith("User force closed the prompt")) {
                    return;
                }
                if (e instanceof SpawnError) {
                    // 子进程用的是 stdio inherit, 失败原因已经打在终端上了,
                    // 再抛一份堆栈没有意义
                    console.log(
                        HeartbreakEmoji
                        , colors.red(`命令执行失败, 退出码 ${e.code}`)
                    );
                    return;
                }
                console.log(e);
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
                console.log(
                    colors.yellow(`🤔 启动 Logo 输出文件 ${colors.bold(this.#config.wellcomFileName)} 不存在`)
                );
                console.log("   如不希望显示启动 Logo, 可将", colors.bold("wellcomFileName"), "设为 null");
            }
        }
        return this;
    }

    /**配置处理器 */
    #configProcessor() {
        const { ignoreMenus } = this.#config;
        if (!isUndefined(ignoreMenus)) {
            if (isBoolean(ignoreMenus) && ignoreMenus === true) {
                this.#menus = [];
                this.#menusVal = [];
            } else if (isObject(ignoreMenus)) {
                this.#menus = this.#menus.filter(item => !ignoreMenus[item.value]);
                this.#menusVal = this.#menus.map(m => m.value);
            }
        }
    }

    /**
     * 加载项目配置控制文件
     * @param confPath 配置文件地址
     */
    loadConfig(confPath: string) {
        if (checkFileStat(confPath)) {
            let conf = require(confPath);
            this.#config = merge({}, DefConfig, conf);
            this.#configProcessor();
        }
        return this;
    }

    /**设置钩子 */
    hooks(setting: LaunchHooks) {
        if (isObject(setting)) {
            Object.keys(setting).forEach(key => {
                const hook = setting[key];
                if (isExecutable(hook.onEnd) || isExecutable(hook.onProcessing) || isExecutable(hook.onStart)) {
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