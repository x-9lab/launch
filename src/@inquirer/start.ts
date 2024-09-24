import { copy, isBoolean, isObject, isString } from "@x-drive/utils";
import type { IPackages, Inquirer } from "../helper";
import type { MenuItem } from "../launch";
import { EXIT_PACK } from "../consts";
import { XLaunch } from "../launch";
import { spawn } from "../helper";

enum CmdType {
    /**启动 dev 环境 */
    StartDev = "start-dev"

    /**启动生产环境 */
    , StartProd = "start-prod"

    /**启动 Debug 环境 */
    , StartDebug = "start-debug"

    /**退出 */
    , Exit = ""
}

type StartAnswers = Record<string, CmdType>;

/**环境 */
const StartType: MenuItem[] = [
    {
        "name": "开发环境"
        , "value": CmdType.StartDev
    }
    , {
        "name": "生产环境"
        , "value": CmdType.StartProd
    }
];

/**
 * 命令是否在 root 上执行
 * @param conf 是否在根目录上执行的配置
 * @param name 在根目录上执行的项目
 */
function isOnRoot(conf: boolean | Record<string, boolean>, name?: string) {
    if (isBoolean(conf)) {
        return conf;
    }
    if (isString(name) && isObject(conf)) {
        return Boolean(conf[name]);
    }
    return false;
}

const services = [];

async function startProject(inquirer: Inquirer, cmd: CmdType, onRootConf: boolean | Record<string, boolean>) {
    await inquirer.prompt<Record<string, string>>([{
        "type": "list"
        , "loop": false
        , "name": "name"
        , "message": "运行项目 >> "
        , "choices": services
    }]).then(async answers => {
        if (answers.name === CmdType.Exit) {
            process.exit(0);
        }
        if (isOnRoot(onRootConf, answers.name)) {
            await spawn("yarn", [cmd]);
        } else {
            await spawn("yarn", ["workspace", answers.name, cmd]);
        }
    });
}

/**启动环境 */
async function start(inquirer: Inquirer, Packages: IPackages) {
    const onRoot = XLaunch.getConfig("startAtRoot");
    const showDebugEnv = XLaunch.getConfig("showStartDebugEnv");
    if (isObject(onRoot) || Boolean(onRoot) === false) {
        if (services.length === 0) {
            Object.keys(Packages).forEach(key => {
                if (Packages[key].isServices) {
                    services.push(Packages[key]);
                }
            });
            services.push(EXIT_PACK);
        }
    }

    const startTypes = copy(StartType);
    if (showDebugEnv) {
        startTypes.push({
            "name": "DEBUG 环境"
            , "value": CmdType.StartDebug
        });
    }
    startTypes.push(EXIT_PACK);

    await inquirer
        .prompt<StartAnswers>([{
            "type": "list"
            , "loop": false
            , "name": "env"
            , "message": "运行环境 >> "
            , "choices": startTypes
        }])
        .then(async answers => {
            if (answers.env === CmdType.Exit) {
                process.exit(0);
            }
            if (isOnRoot(onRoot)) {
                await spawn("yarn", [answers.env]);
            } else {
                await startProject(inquirer, answers.env, onRoot);
            }
        });
}

export default start;