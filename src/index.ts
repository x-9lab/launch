import "colors";
import type { LaunchConfig } from "./launch";
import { Launch, XLaunch } from "./launch";
import type { IPackages } from "./helper";
import type { Inquirer } from "inquirer";


declare global {
    /**monorepo 项目管理操作菜单 Launch 实例 */
    const xlaunch: Launch;

    /**用户自定义交互菜单模块导出对象 */
    interface XLaunchInquirerExport {
        /**交互菜单名称 */
        name: string;

        /**交互菜单操作函数 */
        processor(inquirer?: Inquirer, Packages?: IPackages, BuildSequence?: string[]): PromiseLike<void>;
    }

    interface XLaunchConfig extends LaunchConfig {

    }
}

// 挂个全局的对象
Object.defineProperty(global, "xlaunch", {
    "enumerable": true
    , "writable": false
    , "value": XLaunch
});

/**启动函数 */
function boot(conf: LaunchConfig = {}) {
    XLaunch.boot(conf);
}

export default boot;

if (require.main === module) {
    boot();
}