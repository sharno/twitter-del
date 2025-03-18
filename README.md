# twitter-del

Download your archive from Twitter

Install packages:

```sh
bun install
```

Create a developer account and fill in the script the keys needed **in a `.env` file**

```
appKey=
appSecret=
accessToken=
accessSecret=
```

Make sure that your tokens have **write access** (this is tricky a bit in the twitter dev interface)

Trigger the script by specifying the **extracted folder of your archive** and the **dates that you want to delete tweets within**

Using Bun:

```sh
bun ./index.ts -p "C:\Users\USER\Downloads\twitter-archive-path\" --from "2011-05-01" --until "2011-05-05"
```
