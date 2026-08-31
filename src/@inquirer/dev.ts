import { spawn, resolveCommand, colors } from "../helper";
import type { IPackages, Inquirer } from "../helper";
import { getPackByName } from "../registry";
import { EXIT_PACK } from "../consts";
import { copy } from "@x-drive/utils";

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
            .concat([copy(EXIT_PACK)])
    }

    await inquirer
        // @FIXME: 这里的类型定义告警
        .prompt<Record<string, string>>([config as any])
        .then(async (answers) => {
            if (answers.name === "" || Array.isArray(answers.name) && answers.name.indexOf("") !== -1) {
                process.exit(0);
            }
            const pack = getPackByName(answers.name);
            const cmd = pack && resolveCommand(pack, "dev");
            if (!cmd) {
                console.log(
                    colors.yellow(`⚠️  ${colors.bold(answers.name)} 未声明 dev 脚本`)
                );
                return;
            }
            await spawn(cmd.command, cmd.args, cmd.options);
        });
}
export default dev;