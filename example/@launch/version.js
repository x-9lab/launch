const { version } = require("../package.json");
const LOGO = [
    ``
    // Calvin S
    , `   ┌─┐┌┬┐┬ ┬`.cyan
    , `   ├┤  │ ├─┤`.cyan
    , `   └─┘ ┴ ┴ ┴`.cyan + ` v${version}`.grey
    , ``
];
module.exports = function () {
    console.log(LOGO.join("\n"));
}
