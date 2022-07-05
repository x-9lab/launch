import { isArray } from "@x-drive/utils";
import crossSpawn from "cross-spawn";

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


class SpawnError extends Error {
    code: number;
}

/**
 * spawn 模式执行一条命令
 * @param  args 执行 spawn 需要用到的参数
 * @return      boolean
 */
function spawn(...args: any[]) {
    return new Promise((res, rej) => {
        crossSpawn(
            ...args
            , {
                "stdio": "inherit"
            }
        ).on("error", (err: Error) => {
            console.error(err);
            rej(err);
        }).on("close", (code: number) => {
            if (Number(code) !== 0) {
                const err = new SpawnError(`子进程退出, Code: ${code}`);
                err.code = code;
                // TODO: 自动拉起来？
                console.error(err)
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
 * @param {string[]} names          要运行的项目名称列表
 * @param {string[]} BuildSequence  所有运行的项目列表
 * @param {string} task             运行的命令名称
 * @param {boolean} noSort          运行的命令名称
 */
async function job(names, BuildSequence, task, noSort = false) {
    if ((!isArray(names) || !names.length) && !noSort) {
        return;
    }

    const sequence = noSort ? BuildSequence : names.sort((now, next) => {
        return BuildSequence.indexOf(now) - BuildSequence.indexOf(next);
    });
    var i = 0;
    try {
        for (; i < sequence.length; i++) {
            await spawn("yarn", ["workspace", sequence[i], task]);
            console.log(
                `📦 ${sequence[i]} `.bold + `${task} `.cyan + "success".green
            );
        }
    } catch (e) {
        console.log(
            `📦 ${sequence[i]} `.bold + `${task} `.cyan + "failure".red
        );
    }
}
export { job };