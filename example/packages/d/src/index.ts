import sayAWord from "@x-9lab/launch-example-a";
import sayBWord from "@x-9lab/launch-example-b";
import sayCWord from "@x-9lab/launch-example-c";

function sayDWord() {
    console.log(`@Env [${process.env.NODE_ENV}]`);
    sayAWord();
    sayBWord();
    sayCWord();
    console.log("Hello... D");
}

sayDWord();