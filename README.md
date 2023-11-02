<img src="https://github.com/aberrator9/BeetBot/assets/127802772/77100304-871b-43b6-8e3e-758404ef0cfe" align="center" style="max-width:60vw;">

<p></p>
<p>Automatically post music from a Spotify playlist to Reddit.</p>


Any tracks added to a user-specified playlist will be periodically posted to subreddit(s) of choice. Includes optional "fuzzing," or randomized delay to make posts appear more organic.

Uses NodeJS with the Spotify, Google, and Reddit APIs.


## Setup and run locally

To set up this script, run the following commands in your terminal:
```
git clone https://github.com/aberrator9/BeetBot.git
npm install
node beetbot.js
```

This will install all  node dependencies, and BeetBot will create some required files, as well as a `/logs` directory, and an `.env` file with some default keys that we will assign values in the following steps.

### Connect and authorize a Spotify App

1. [Create a Spotify app](https://developer.spotify.com/dashboard). During setup, set the Redirect URI to http://localhost:8888/callback, and check the "Web API" boxes.
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

Copy the value that is in place of _PLAYLIST_ID_ to the `S_PLAYLIST` key in the `.env`.

### Connect the YouTube API

Coming soon!

### Connect the Reddit API

Coming soon!

## Usage

Start the script with `node beetbot.js`, and it will run continuously, attempting to post every time the posting interval has elapsed.

Optionally, use something like [Forever](https://www.npmjs.com/package/forever) to ensure that the script runs _forever_ and is restarted in the event of a crash.

To install and run the script using Forever, run the following commands:

```
npm install forever
forever start beetbot.js
```

(Remember to include the operation of this script in your will, in case it continues to run after you have passed away.)

That's it! Now any time you add a song to your Spotify playlist, it will get posted to Reddit. Don't worry about accidentally adding songs you've already posted; BeetBot will remember that for you and skip them automatically! It will also keep a list of songs for which it failed to find a reliable match on YouTube (see `notPosted.json`), in case you want to post those manually later.

Happy posting!