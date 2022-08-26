xlaunch.hooks({
    "boot": {
        onEnd() {
            console.log("⌛️ Boot end...");
        }
        , onStart() {
            console.log("⏳ Boot start...");
        }
    }
});

/**
 * 配置项
 * @type {XLaunchConfig}
 */
const Conf = {
    // "startAtRoot": true
    "startAtRoot": {
        // 指定 @x-9lab/launch-example-e 的环境启动命令在根目录上
        "@x-9lab/launch-example-e": true
    }
    , "showStartDebugEnv": true
    // 为 true 时屏蔽所有内置菜单
    // , "ignoreMenus": true
    // 单独指定屏蔽某菜单
    , "ignoreMenus": {
        "patch": true
        // 也可屏蔽自定义菜单
        // , "compile": true
    }
    , "enableCache": true
};

module.exports = Conf;