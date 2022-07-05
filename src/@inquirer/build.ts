
import type { Inquirer } from "inquirer";
import type { IPackages } from "../helper";
import { job } from "../helper";

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
    inquirer.prompt([
        {
            "type": "list"
            , "loop": false
            , "name": "name"
            , "message": "打包类型 >> "
            , "suffix": ""
            , "choices": [
                {
                    "name": "全部打包"
                    , "value": "all"
                }
                , {
                    "name": "部分打包"
                    , "value": "part"
                }
            ]
        }
    ]).then((answers) => {
        const { name } = answers;
        if (name === "all") {
            job(null, BuildSequence, "build", true);
        } else {
            build(inquirer, Packages, BuildSequence);
        }
    })
}

export default buildMode;