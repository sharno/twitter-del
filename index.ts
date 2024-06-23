import { TwitterApi } from "twitter-api-v2";
import { join } from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { readFileSync } from "node:fs";

const appKey = "FILL_YOUR_KEY";
const appSecret = "FILL_YOUR_KEY";
const accessToken = "FILL_YOUR_KEY";
const accessSecret = "FILL_YOUR_KEY";

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
	};
}
const json: Tweet[] = JSON.parse(await text);

const toDel = json
	.map((t) => t.tweet.edit_info.initial)
	.filter((t) => t.editableUntil >= argv.from && t.editableUntil <= argv.until)
	.toSorted((a, b) => a.editableUntil.localeCompare(b.editableUntil));

const tweetIds = toDel.map((t) => t.editTweetIds[0]);

// Connect to Twitter and delete
const twitterClient = new TwitterApi({
	appKey,
	appSecret,
	accessToken,
	accessSecret,
});

async function deleteTweet(tweetId: string) {
	console.log("deleting", tweetId);
	const res = await twitterClient.v2
		.deleteTweet(tweetId)
		.catch((e) => console.error(e));
	if (res) {
		console.log(res);
	}
}
const delTasks = tweetIds.map((id) => () => deleteTweet(id));

const processInPool = async (
	tasks: (() => Promise<unknown>)[],
	poolSize: number,
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

await processInPool(delTasks, 2);
