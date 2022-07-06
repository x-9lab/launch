
import type { IPackages } from "../helper";
import type { Inquirer } from "inquirer";
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
function build(inquirer: Inquirer, Packages: IPackages, BuildSequence: string[]) {
    inquirer
        .prompt([
            {
                "type": "checkbox"
                , "loop": false
                , "name": "name"
                , "message": "打包项目 >> "
                , "suffix": ""
                , "choices": Object.keys(Packages)
                    .map(key => Packages[key])
            }
        ])
        .then((answers) => {
            const { name } = answers;
            if (!name || !name.length) {
                return;
            }
            job(name, BuildSequence, "build");
        });
}


/**选择打包类型 */
function buildMode(inquirer: Inquirer, Packages: IPackages, BuildSequence: string[]) {
    const exit = copy(EXIT_PACK);
    exit.value = BuildModes.Exit;

    inquirer.prompt<Record<string, BuildModes>>([
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
        }
    ]).then((answers) => {
        const { name } = answers;
        switch (name) {
            case BuildModes.All:
                job(null, BuildSequence, "build", true);
                break;

            case BuildModes.Part:
                build(inquirer, Packages, BuildSequence);
                break;

            case BuildModes.Exit:
                process.exit(0);
                break;
        }
    });
}

export default buildMode;