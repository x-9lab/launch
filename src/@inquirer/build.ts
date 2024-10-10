import type { IPackages, Inquirer } from "../helper";
import { EXIT_PACK } from "../consts";
import { copy } from "@x-drive/utils";
import { job } from "../helper";

enum BuildModes {
    /**全部打包 */
    All = "all"
    /**部分打包 */
    , Part = "part"
    /**退出 */
    , Exit = "exit"
}

/**部分打包 */
async function build(inquirer: Inquirer, Packages: IPackages, BuildSequence: string[]) {
    const exit = copy(EXIT_PACK);
    exit.value = BuildModes.Exit;
    return inquirer
        .prompt([
            {
                "type": "checkbox"
                , "loop": false
                , "name": "name"
                , "message": "打包项目 >> "
                , "suffix": ""
                , "choices": Object.keys(Packages)
                    .map(key => Packages[key])
                    .concat([exit])
            } as any
        ])
        .then(async (answers) => {
            const { name } = answers;
            if (!name || !name.length) {
                return;
            }
            await job(name, BuildSequence, "build");
        });
}


/**选择打包类型 */
async function buildMode(inquirer: Inquirer, Packages: IPackages, BuildSequence: string[]) {
    const exit = copy(EXIT_PACK);
    exit.value = BuildModes.Exit;

    await inquirer.prompt<Record<string, BuildModes>>([
        // @FIXME: 这里的类型定义告警
        {
            "type": "list"
            , "loop": false
            , "name": "name"
            , "message": "打包类型 >> "
            , "suffix": ""
            , "choices": [
                {
                    "name": "全部打包"
                    , "value": BuildModes.All
                }
                , {
                    "name": "部分打包"
                    , "value": BuildModes.Part
                }
                , exit
            ]
        } as any
    ]).then(async (answers) => {
        const { name } = answers;
        switch (name) {
            case BuildModes.All:
                await job(null, BuildSequence, "build", true);
                break;

            case BuildModes.Part:
                await build(inquirer, Packages, BuildSequence);
                break;

            case BuildModes.Exit:
                process.exit(0);
                break;
        }
    });
}

export default buildMode;