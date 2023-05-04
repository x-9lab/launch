import type { CommonSpawnOptions } from "child_process";
import { isArray } from "@x-drive/utils";
import crossSpawn from "cross-spawn";
import colors from "colors/safe";
import path from "path";
import fs from "fs";

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
}
export type { IPack };

type IPackages = Record<string, IPack>;
export type { IPackages }

export { colors }

class SpawnError extends Error {
    code: number;
}

/**
 * spawn 模式执行一条命令
 * @param  command 命令
 * @param  args    参数
 * @param  options 配置对象
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
        }).on("close", (code: number) => {
            if (Number(code) !== 0) {
                const err = new SpawnError(`子进程退出, Code: ${code}`);
                if (!quiet) {
                    err.code = code;
                    // TODO: 自动拉起来？
                    console.error(err)
                }
                rej(err);
            } else {
                res(true);
            }
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