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
};

module.exports = Conf;