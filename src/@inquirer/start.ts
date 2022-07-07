import type { IPackages } from "../helper";
import type { MenuItem } from "../launch";
import type { Inquirer } from "inquirer";
import { EXIT_PACK } from "../consts";
import { copy, isBoolean, isObject } from "@x-drive/utils";
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

const services = [];

async function startProject(inquirer: Inquirer, cmd: CmdType) {
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
        await spawn("yarn", ["workspace", answers.name, cmd]);
    });
}

/**命令是否在 root 上执行 */
function isOnRoot(conf: boolean | Record<string, boolean>, env: string) {
    if (isBoolean(conf)) {
        return conf;
    }
    if (isObject(conf)) {
        return Boolean(conf[env]);
    }
    return false;
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
            if (isOnRoot(onRoot, answers.env)) {
                await spawn("yarn", [answers.env]);
            } else {
                await startProject(inquirer, answers.env);
            }
        });
}

export default start;