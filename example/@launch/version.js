const { version } = require("../package.json");
const colors = require("colors/safe");
const LOGO = [
    ``
    // Calvin S
    , colors.cyan(`   ┌─┐┌┬┐┬ ┬`)
    , colors.cyan(`   ├┤  │ ├─┤`)
    , colors.cyan(`   └─┘ ┴ ┴ ┴`) + colors.grey(` v${version}`)
    , ``
];
module.exports = function () {
    console.log(LOGO.join("\n"));
}
