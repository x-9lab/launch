import type { Inquirer } from "../helper";
import { EXIT_PACK } from "../consts";
import { copy } from "@x-drive/utils";

enum PatchType {
    React24304 = "react-24304"
    , Exit = ""
}

/**环境 */
const PatchList = [
    {
        "name": "React #24304"
        , "value": PatchType.React24304
    }
    , copy(EXIT_PACK)
];

async function patch(inquirer: Inquirer) {
    await inquirer
        .prompt<Record<string, PatchType>>([{
            "type": "list"
            , "loop": false
            , "name": "issue"
            , "message": "修复 >> "
            , "choices": PatchList
        }])
        .then(async answers => {
            switch (answers.issue) {
                case PatchType.React24304:
                    const { fix24304 } = await import("../components/patchs/react-24304");
                    await fix24304();
                    break;

                case PatchType.Exit:
                    process.exit(0);
                    break;
            }
        });
}

export default patch;