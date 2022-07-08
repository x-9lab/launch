import { spawn, colors } from "../helper";

async function boot() {
    await spawn("yarn", ["boot"]).then(async () => {
        console.log("💡  如果你是第一次运行项目,建议执行一次: " + colors.yellow("代码打包 -> 全部打包"));
    });
}

export default boot;