import type { IPackages, Inquirer } from "../helper";
import { EXIT_PACK } from "../consts";
import { spawn } from "../helper";

/**项目选择 */
async function dev(inquirer: Inquirer, Packages: IPackages) {

    const config = {
        "type": "list"
        , "loop": false
        , "name": "name"
        , "message": "运行项目 >> "
        , "suffix": ""
        , "choices": Object.keys(Packages)
            .map(key => Packages[key])
            .concat([EXIT_PACK])
    }

    await inquirer
        // @FIXME: 这里的类型定义告警
        .prompt<Record<string, string>>([config as any])
        .then(async (answers) => {
            if (answers.name === "" || Array.isArray(answers.name) && answers.name.indexOf("") !== -1) {
                process.exit(0);
            }
            await spawn("yarn", ["workspace", answers.name, "dev"]);
        });
}
export default dev;