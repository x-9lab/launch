import type { CommonSpawnOptions } from "child_process";
import { isArray } from "@x-drive/utils";
import crossSpawn from "cross-spawn";
import colors from "colors/safe";
import inquirer from "inquirer";
import path from "path";
import fs from "fs";




type Inquirer = typeof inquirer;
export type { Inquirer }

interface IPack {
    /**项目名 */
    name: string;

    /**包名 */
    value: string;

    /**执行顺序 */
    index: number;

    /**包版本 */
    version: string;

    /**是否是可运行的服务 */
    isServices: boolean;

    /**是否是直接部署的静态文件 */
    isStatic: boolean;

    /**
     * 包所在绝对路径
     *
     * 以下三个字段是可选的: EXIT_PACK 这类菜单哨兵并不是包, 不该被迫长出
     * 包的字段。读取处需要做防御。
     */
    dir?: string;

    /**执行方式 */
    runner?: "yarn-workspace" | "shell";

    /**脚本名 -> 命令 */
    scripts?: Record<string, string>;
}
export type { IPack };

type IPackages = Record<string, IPack>;
export type { IPackages }

export { colors }

/**子进程以非 0 退出码结束 */
class SpawnError extends Error {
    code: number;
}
export { SpawnError }

/**
 * spawn 模式执行一条命令
 *
 * quiet 只控制**是否打印错误**, 不影响 promise 是否结算 —— 无论如何都必须
 * 结算, 否则调用方的 await 会永远挂住。
 *
 * @param  command 命令
 * @param  args    参数
 * @param  options 配置对象
 * @param  quiet   失败时是否静默, 不打印错误
 * @return      boolean
 */
function spawn(
    command: string
    , args: string[]
    , options: CommonSpawnOptions = {
        "stdio": "inherit"
    }
    , quiet: boolean = true
) {
    return new Promise((res, rej) => {
        crossSpawn(
            command
            , args
            , options
        ).on("error", (err: Error) => {
            if (!quiet) {
                console.error(err);
            }
            rej(err);
        }).on("close", (code: number, signal: string) => {
            // 被信号杀掉时 code 为 null, 最常见的是用户 Ctrl+C 停掉 dev 服务,
            // 那是正常操作不是失败
            if (signal || Number(code) === 0) {
                res(true);
                return;
            }
            const err = new SpawnError(`子进程退出, Code: ${code}`);
            err.code = code;
            if (!quiet) {
                console.error(err);
            }
            rej(err);
        });
    });
}

export { spawn };


/**
 * 执行脚本
 * @param names          要运行的项目名称列表
 * @param BuildSequence  所有运行的项目列表
 * @param task           运行的命令名称
 * @param noSort         忽略编译顺序声明
 * @param quiet          是否静默执行
 */
async function job(names: string[], BuildSequence: string[], task: string, noSort: boolean = false, quiet: boolean = true) {
    if ((!isArray(names) || !names.length) && !noSort) {
        return;
    }

    const sequence = noSort ? BuildSequence : names.sort((now, next) => {
        return BuildSequence.indexOf(now) - BuildSequence.indexOf(next);
    });
    var i = 0;
    try {
        for (; i < sequence.length; i++) {
            console.log(
                `👩‍🔧 ${colors.bold(sequence[i])} ` + `${colors.cyan(task)} ` + colors.cyan("starting")
            );
            await spawn("yarn", ["workspace", sequence[i], task], undefined, quiet);
            console.log(
                `📦 ${colors.bold(sequence[i])} ` + `${colors.cyan(task)} ` + colors.green("success")
            );
        }
    } catch (e) {
        console.log(
            `📦 ${colors.bold(sequence[i])} ` + `${colors.cyan(task)} ` + colors.red("failure")
        );
    }
}
export { job };

/**
 * 检测指定文件是否存在
 */
function checkFileStat(pathStr: string, resolve?: boolean) {
    if (resolve) {
        pathStr = path.resolve(__dirname, pathStr);
    }
    var stat: boolean = false;
    try {
        fs.statSync(pathStr);
        stat = true;
    } catch (e) {
        stat = false;
    }
    return stat;
}
export { checkFileStat }

/**
 * 查找到文件时的处理函数
 * @param tmpPath 文件地址
 */
type WalkCallback = (tmpPath: string, item: string) => void;

/**
 * 递归处理文件夹
 * @param  path      文件目录
 * @param  floor     层级
 * @param  callback  查找到文件时的处理函数
 */
function walk(path: string, floor: number, callback: WalkCallback) {
    floor++;
    var files = fs.readdirSync(path);
    files.forEach(function (item) {
        if (!item.startsWith(".") && !item.endsWith(".d.ts")) {
            var tmpPath = path + "/" + item;
            var stats = fs.statSync(tmpPath);
            if (stats.isDirectory() && item.indexOf("@") === -1) {
                walk(tmpPath, floor, callback);
            } else if (!stats.isDirectory()) {
                callback(tmpPath, item);
            }
        }
    });
}
export { walk }