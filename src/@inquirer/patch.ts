import type { Inquirer } from "inquirer";
import { EXIT_PACK } from "../consts";
import { spawn } from "../helper";
import fs from "fs/promises";
import path from "path";

enum PatchType {
    React24304 = "react-24304"
    , Exit = ""
}

/**环境 */
const PatchList = [
    {
        "name": "React #24304"
        , "value": PatchType.React24304
    }
    , EXIT_PACK
];

async function cleanReactTypes() {
    console.log("   💊 正在清理有问题的 @types/react 版本");
    const typeDir = path.resolve(
        process.cwd()
        , "node_modules"
        , "@types"
    );
    try {
        const fileList = await fs.readdir(typeDir);
        const targetList = fileList.filter(async name => {
            return name.startsWith("react-");
        });
        if (targetList.length) {
            for (let i = 0; i < targetList.length; i++) {
                const targetPath = path.join(
                    typeDir, targetList[i], "node_modules", "@types", "react"
                );
                await fs.rm(
                    targetPath
                    , {
                        "force": true
                        , "recursive": true
                    }
                );
            }
        }
    } catch (e) {
        console.log(e);
    }
}

async function patch(inquirer: Inquirer) {
    await inquirer
        .prompt<Record<string, PatchType>>([{
            "type": "list"
            , "loop": false
            , "name": "issue"
            , "message": "修复 >> "
            , "choices": PatchList
        }])
        .then(async answers => {
            switch (answers.issue) {
                case PatchType.React24304:
                    console.log("\n🐒 正在修复 react #24304 问题, 问题解决前系统将强制使用: " + "@types/react@17.0.11".yellow);
                    await spawn("yarn", ["add", "@types/react@17.0.11", "-W"]);
                    await cleanReactTypes();
                    break;

                case PatchType.Exit:
                    process.exit(0);
                    break;
            }
        });
}

export default patch;