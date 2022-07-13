/**编译模式 */
const CompileType = [
    {
        "name": "全部"
        , "value": "build"
    }
    , {
        "name": "Mac"
        , "value": "build-mac"
    }
    , {
        "name": "Windows"
        , "value": "build-win"
    }
    , xlaunch.EXIT_PACK
];

/**
 * 选择编译类型
 * @type {XLaunchInquirerExportProcessor}
 * @param inquirer 
 */
function compile(inquirer) {
    inquirer
        .prompt([{
            "type": "list"
            , "loop": false
            , "name": "type"
            , "message": "编译 >> "
            , "choices": CompileType
        }])
        .then(answers => {
            console.log(" ", "编译类型 >>", answers.type);
            // xlaunch.spawn("yarn", [answers.type]);
            process.exit(0);
        });
}

/**@type {XLaunchInquirerExport} */
module.exports = {
    "name": "编译安装包"
    , processor: compile
};