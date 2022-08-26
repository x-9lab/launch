import { spawn, colors } from "../../helper";
import fs from "fs/promises";
import path from "path";

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

async function fix24304() {
    console.log("\n🐒 正在修复 react #24304 问题, 问题解决前系统将强制使用: " + colors.yellow("@types/react@17.0.11"));
    await spawn("yarn", ["add", "@types/react@17.0.11", "-W"]);
    await cleanReactTypes();
}

export { fix24304 };