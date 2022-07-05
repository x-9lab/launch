import sayAWord from "@x-drive/launch-example-a";
import sayBWord from "@x-drive/launch-example-b";
import sayCWord from "@x-drive/launch-example-c";

function sayDWord() {
    console.log(`@Env [${process.env.NODE_ENV}]`);
    sayAWord();
    sayBWord();
    sayCWord();
    console.log("Hello... D");
}

sayDWord();