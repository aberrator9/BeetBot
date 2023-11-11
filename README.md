<img src="https://github.com/aberrator9/BeetBot/assets/127802772/77100304-871b-43b6-8e3e-758404ef0cfe" style="width:50%;">

<p></p>
<p>Automatically post music from a Spotify playlist to Reddit!</p>

Any tracks added to a user-specified playlist will be periodically posted to a subreddit of choice. BeetBot pulls all relevant info about a track from Spotify, then uses a string comparison algorithm (npm string-similarity) to find a matching YouTube link, and posts it to Reddit using title formatting that is the convention for most music subreddits: `Artist - Title [genre] (year)`. Posts occur on a scheduled interval (default 8 hours) and include optional "fuzzing," or randomized delay to make post times appear more organic.

Don't worry about accidentally adding songs you've already posted; BeetBot will remember that for you and skip them automatically! It will also keep a list of songs for which it failed to find a reliable match on YouTube (see `notPosted.json`), in case you want to post those manually later.

Built with NodeJS and the Spotify, Google, and Reddit APIs.

## Setup and run locally

To set up this script, run the following commands in your terminal:
```
git clone https://github.com/aberrator9/BeetBot.git
npm install
node beetbot.js
```

This will install all Node dependencies and create some required files, as well as a `/logs` directory, and an `.env` file with some default keys that we will assign values in the following steps.

### Connect and authorize a Spotify App

1. [Create a Spotify app](https://developer.spotify.com/dashboard). During setup, set the Redirect URI to http://localhost:8888/callback, and check the "Web API" box.
2. Navigate to your app's settings, and copy the _Client Id_ and _Client Secret_ values to `S_CLIENT_ID` and `S_CLIENT_SECRET` in the `.env` file.
3. In your terminal, run the following from the project directory:
```
node authorize-spotify.js  
```
4. Follow the link provided in the terminal (http://localhost:8888/login) and authorize your Spotify app by clicking "AGREE."
5. Back in the terminal, copy the _access_token_ and _refresh_token_ to `.env` file's `S_ACCESS_TOKEN` and `S_REFRESH TOKEN` fields respectively.
6. Create the Spotify playlist you intend to use for posting (for example, "Post to Reddit"), and navigate to it in a browser. The url will look like this:

```
https://open.spotify.com/playlist/PLAYLIST_ID
``` 

Copy the value in place of _PLAYLIST_ID_ to the `S_PLAYLIST` key in the `.env`.

### Connect the YouTube API

1. Log into the [Google Cloud console](https://console.cloud.google.com/projectselector2/apis/dashboard) and create a new project.
2. Click the _Enable APIs and Services_ button, then scroll down and click on _YouTube Data API v3._ On the next page, click _Enable._
3. On the YouTube Data API v3 page, click _Create credentials._ On the next page, select _Public Data,_ and click _Next_. Copy the API key value then click _Done_. Paste the API key in the `Y_API_KEY` field in the `.env`.

### Connect the Reddit API

1. Copy the Reddit username and password for the account you wish to use to the `R_USER` and `R_PASS` values in the `.env`.
2. Go to the [Reddit API page](https://www.reddit.com/prefs/apps) and create a new app, pasting the following into the _redirect URI_ field:

```
https://not-an-aardvark.github.io/reddit-oauth-helper/
```

3. On the Reddit app preferences page, locate your app's _Client Id_. This should be a code written under the name of your app, as highlighted in this screenshot:

![reddit-client-id](https://github.com/aberrator9/BeetBot/assets/127802772/f3aba656-1625-4619-95c1-cc061b3f7f3d)

4. Copy this value, along with the _secret_ value from the preference page to the `R_CLIENT_ID` and `R_CLIENT_SECRET` fields of the `.env` file.
5. Open [Reddit OAuth Helper](https://not-an-aardvark.github.io/reddit-oauth-helper/), copy the previous values to the matching fields, check your desired scopes (you can just check all), check _Permanent_, and click _Generate tokens_.

(_Note: The Reddit OAuth Helper page may not work on certain browsers; if it says "loading..." for more than a few seconds, try another browser._)

6. When prompted, click _Allow_ to connect the app to your Reddit account.
7. Back on the Reddit OAuth Helper page, copy the newly generated _Refresh token_ and _Access token_ values to the `R_REFRESH_TOKEN` and `R_ACCESS_TOKEN` fields in the `.env`.

## Usage

1. Set your target subreddit and post interval in the `.env` file.
2. Start the script with `node beetbot.js`, and it will run continuously, attempting to post every time the posting interval has elapsed.

Optionally, use something like [Forever](https://www.npmjs.com/package/forever) to ensure that the script runs _forever_ and is restarted in the event of a crash.

To install and run the script using Forever, run the following commands:

```
npm install forever
forever start beetbot.js
```

(Remember to include the operation of this script in your will, in case it continues to run after you have passed away.)

That's it (_phew_)! Now any time you add a song to your Spotify playlist, it will get posted to Reddit.

Happy posting!
