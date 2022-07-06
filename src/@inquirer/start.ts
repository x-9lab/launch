import type { IPackages } from "../helper";
import type { Inquirer } from "inquirer";
import { EXIT_PACK } from "../consts";
import { spawn } from "../helper";

enum CmdType {
    /**启动 dev 环境 */
    StartDev = "start-dev"

    /**启动生产环境 */
    , StartProd = "start-prod"

    /**退出 */
    , Exit = ""
}

type StartAnswers = Record<string, CmdType>;

/**环境 */
const StartType = [
    {
        "name": "开发环境"
        , "value": CmdType.StartDev
    }
    , {
        "name": "生产环境"
        , "value": CmdType.StartProd
    }
    , EXIT_PACK
];

const services = [];

function startProject(inquirer: Inquirer, cmd: CmdType) {
    inquirer.prompt<Record<string, string>>([{
        "type": "list"
        , "loop": false
        , "name": "name"
        , "message": "运行项目 >> "
        , "choices": services
    }]).then(answers => {
        if (answers.name === CmdType.Exit) {
            process.exit(0);
        }
        spawn("yarn", ["workspace", answers.name, cmd]);
    });
}

/**启动环境 */
function start(inquirer: Inquirer, Packages: IPackages) {
    if (services.length === 0) {
        Object.keys(Packages).forEach(key => {
            if (Packages[key].isServices) {
                services.push(Packages[key]);
            }
        });
        services.push(EXIT_PACK);
    }
    inquirer
        .prompt<StartAnswers>([{
            "type": "list"
            , "loop": false
            , "name": "cmd"
            , "message": "运行环境 >> "
            , "choices": StartType
        }])
        .then(answers => {
            if (answers.cmd === CmdType.Exit) {
                process.exit(0);
            }
            startProject(inquirer, answers.cmd);
        });
}

export default start;