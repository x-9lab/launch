import type { IPack } from "./helper";

/**标准退出选项 */
export const EXIT_PACK: IPack = {
    "name": "退出"
    , "value": ""
    , "index": -1
    , "isServices": false
    , "isStatic": false
    , "version": ""
}

/**奇怪的数字 */
export const MAGIC_CODE = 709394;

/**点 */
export const DOT = "•";

/**信息对应的颜色类型 */
export const LOG_TYPE = {
    "info": "blue"
    , "warn": "yellow"
    , "error": "red"
    , "success": "green"
    , "process": "magenta"
}