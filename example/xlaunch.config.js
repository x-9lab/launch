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
    "startAtRoot": true
    , "showStartDebugEnv": true
};

module.exports = Conf;