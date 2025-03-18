import { TwitterApi } from "twitter-api-v2";
import { join } from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { readFileSync } from "node:fs";
import * as dotenv from "dotenv";
dotenv.config();

const appKey = process.env.appKey;
const appSecret = process.env.appSecret;
const accessToken = process.env.accessToken;
const accessSecret = process.env.accessSecret;

(async () => {
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    console.error(
      "you need to add a .env file with the required keys: appKey, appSecret, accessToken, accessSecret"
    );
    return;
  }

  const argv = await yargs(hideBin(process.argv))
    .usage("Usage: $0 --path <path> [--from <date>] [--until <date>]")
    .option("path", {
      alias: "p",
      describe: "Path to the folder to read",
      type: "string",
      demandOption: true,
    })
    .option("from", {
      describe: "Start date for filtering (YYYY-MM-DD)",
      type: "string",
      demandOption: true,
    })
    .option("until", {
      describe: "End date for filtering (YYYY-MM-DD)",
      type: "string",
      demandOption: true,
    })
    .help("h")
    .alias("h", "help").argv;

  const path = join(argv.path, "data", "tweets.js");
  console.log(path);

  let text = readFileSync(path, "utf8");
  text = text.slice(text.indexOf("["));

  interface Tweet {
    tweet: {
      edit_info: {
        initial: {
          editableUntil: string;
          editTweetIds: string[];
        };
      };
      full_text: string;
    };
  }

  interface MyTweet {
    id: string;
    date: string;
    content: string;
  }
  const json: Tweet[] = JSON.parse(await text);

  const toDel = json
    .map<MyTweet>((t) => ({
      id: t.tweet.edit_info.initial.editTweetIds[0],
      date: t.tweet.edit_info.initial.editableUntil,
      content: t.tweet.full_text,
    }))
    .filter((t) => t.date >= argv.from && t.date <= argv.until)
    .toSorted((a, b) => a.date.localeCompare(b.date));

  // Connect to Twitter and delete
  const twitterClient = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  async function deleteTweet(tweet: MyTweet) {
    const res = await twitterClient.v1
      .deleteTweet(tweet.id)
      .catch((e) => console.error(e));
    console.log("deleted:", tweet);
    if (res) {
      console.log("response:", "success");
    } else {
      console.error("response:", "failed");
    }
  }
  const delTasks = toDel.map((t) => () => deleteTweet(t));

  const processInPool = async (
    tasks: (() => Promise<unknown>)[],
    poolSize: number
  ) => {
    const pool = tasks.toReversed();
    const worker = async () => {
      while (true) {
        const task = pool.pop();
        if (task == null) {
          return;
        }
        await task();
      }
    };

    const workers = Array.from({ length: poolSize }, () => worker());
    return Promise.allSettled(workers);
  };

  await processInPool(delTasks, 5);
})();
