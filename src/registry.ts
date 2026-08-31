import type { IPack, IPackages } from "./helper";

/**
 * 包信息注册表
 *
 * 独立成模块是为了让 helper 与 launch 都能单向依赖它。
 * 若把这些数据留在 launch 里, helper 想按包名反查就得 import launch,
 * 而 launch 本来就 import helper, 会构成模块环。
 */

/**已有的包, 以业务目录名为键 */
var Packages: IPackages = {};

/**构建顺序, 元素为包清单里声明的包名 */
var BuildSequence: string[] = [];

/**获取全部包信息 */
function getPackages() {
    return Packages;
}
export { getPackages }

/**整体替换包信息, 从缓存启动时使用 */
function setPackages(packages: IPackages) {
    Packages = packages;
    return Packages;
}
export { setPackages }

/**
 * 登记一个包
 * @param dirName 业务目录名
 * @param pack    包信息
 */
function setPack(dirName: string, pack: IPack) {
    Packages[dirName] = pack;
    return pack;
}
export { setPack }

/**获取构建顺序 */
function getBuildSequence() {
    return BuildSequence;
}
export { getBuildSequence }

/**整体替换构建顺序, 从缓存启动时使用 */
function setBuildSequence(sequence: string[]) {
    BuildSequence = sequence;
    return BuildSequence;
}
export { setBuildSequence }

/**依据各包声明的顺序生成构建顺序 */
function genBuildSequence() {
    BuildSequence = Object.keys(Packages)
        .sort((now, next) => Packages[now].index - Packages[next].index)
        .map(key => Packages[key].value);
    return BuildSequence;
}
export { genBuildSequence }

/**
 * 按包名反查包信息
 *
 * 菜单选项与 BuildSequence 传递的都是清单里声明的包名, 而 Packages 以业务
 * 目录名为键, 所以需要反查。
 * @param name 清单里声明的包名
 */
function getPackByName(name: string) {
    const dirNames = Object.keys(Packages);
    for (const dirName of dirNames) {
        if (Packages[dirName].value === name) {
            return Packages[dirName];
        }
    }
    return undefined;
}
export { getPackByName }
