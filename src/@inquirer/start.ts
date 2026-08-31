import { copy, isBoolean, isObject, isString } from "@x-drive/utils";
import { spawn, resolveCommand, colors } from "../helper";
import type { IPackages, Inquirer } from "../helper";
import { getPackByName } from "../registry";
import type { MenuItem } from "../launch";
import { EXIT_PACK } from "../consts";

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
            // 根目录执行, 与具体包无关, 保持原样
            await spawn("yarn", [cmd]);
        } else {
            const pack = getPackByName(answers.name);
            const resolved = pack && resolveCommand(pack, cmd);
            if (!resolved) {
                console.log(
                    colors.yellow(`⚠️  ${colors.bold(answers.name)} 未声明 ${cmd} 脚本`)
                );
                return;
            }
            await spawn(resolved.command, resolved.args, resolved.options);
        }
    });
}

/**启动环境相关配置, 由调用方传入, 避免本模块反向依赖 launch */
interface StartConfig {
    /**环境启动命令在根目录 */
    startAtRoot?: boolean | Record<string, boolean>;

    /**显示启动 debug 环境 */
    showStartDebugEnv?: boolean;
}
export type { StartConfig }

/**启动环境 */
async function start(inquirer: Inquirer, Packages: IPackages, config: StartConfig = {}) {
    const onRoot = config.startAtRoot;
    const showDebugEnv = config.showStartDebugEnv;
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