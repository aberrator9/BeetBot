const dotenv = require('dotenv');
const fetch = require('node-fetch');
const spotifyWebApi = require('spotify-web-api-node');
const snoowrap = require('snoowrap');
const google = require('googleapis');
const fs = require('fs');
const he = require('he');
const stringSimilarity = require("string-similarity");

const Logger = require('./modules/logger.js');

const repo = 'https://github.com/aberrator9/BeetBot';
const localEnv = dotenv.config();

function createFile(filePath, contents = '') {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, contents);
  return filePath;
}

const postedJson = createFile('posted.json', '[]');
const notPostedJson = createFile('notPosted.json', '[]');

const logger = new Logger('./logs/beetbot.log', `./logs/beetbot.${Date.now()}.log`, true);

function checkForEnvironmentVariables() {
  if (!fs.existsSync('.env')) {
    const envContent = `# KEYS AND SECRETS\nR_CLIENT_ID=''\nR_CLIENT_SECRET=''\nR_REFRESH_TOKEN=''\nR_ACCESS_TOKEN=''\nR_USER=''\nR_PASS=''\nS_CLIENT_ID=''\nS_CLIENT_SECRET=''\nS_ACCESS_TOKEN=''\nS_REFRESH_TOKEN=''\nS_PLAYLIST=''\nY_API_KEY=''\n\n# VARIABLES\n# https://www.reddit.com/r/test_automation is a public subreddit\n# Feel free to use it for testing BeetBot's output!\nTARGET_SUBREDDIT='test_automation'\n\n# Time between posts in milliseconds\nPOSTING_INTERVAL=28800000; # 8 hrs\n\n# Random amount between zero and FUZZ_TIME added to POSTING_INTERVAL to emulate organic posting\nFUZZ_TIME=3600000 # 1 hr\n\n# Set to 'false' to log to file; 'true' to log to console and file\nDEBUG='true'`;
    fs.writeFileSync('.env', envContent);
    logger.log('warn', `.env file created in local directory, but you will need to finish setting it up! See ${repo} for setup instructions.\nExiting...`)
    process.exit();
  } else {
    const missingValues = Object.entries(localEnv.parsed).filter(([key, value]) => value === '');
    if (missingValues.length > 0) {
      logger.log('warn', `.env file is missing required values! See ${repo} for setup instructions.\nExiting...`);
      process.exit();
    }
  }
}

checkForEnvironmentVariables();

const reddit = new snoowrap({
  userAgent: 'anything',
  clientId: process.env.R_CLIENT_ID,
  clientSecret: process.env.R_CLIENT_SECRET,
  refreshToken: process.env.R_REFRESH_TOKEN,
  username: process.env.R_USER,
  password: process.env.R_PASS
});

const spotify = new spotifyWebApi({
  clientId: process.env.S_CLIENT_ID,
  clientSecret: process.env.S_CLIENT_SECRET,
  refreshToken: process.env.S_REFRESH_TOKEN,
  redirectUri: 'http://localhost:8888/callback'
});

function getTimeStamp(offset = 0) {
  return new Date(Date.now() + offset).toLocaleString();
}

function loadTracks(json) {
  try {
    const data = fs.readFileSync(json, 'utf8');
    return JSON.parse(data) || [];
  } catch (error) {
    logger.log('err', `Error loading tracks from ${json}: ${error}`);
    return [];
  }
}

function saveTracks(json, arr) {
  try {
    fs.writeFileSync(json, JSON.stringify(arr), 'utf8');
  } catch (error) {
    logger.log('err', `Error saving posted tracks: ${error}`);
  }
}

const postedTracks = loadTracks(postedJson);
const notPostedTracks = loadTracks(notPostedJson);
let cachedTracks = [];
const STRING_SIMILARITY_THRESHOLD = 0.6;

spotify.setRefreshToken(process.env.S_REFRESH_TOKEN);

async function getGenre(artist) {
  try {
    const artistInfo = await spotify.getArtist(artist.id);

    if (artistInfo.body.genres.length > 0) {
      return artistInfo.body.genres[0];
    } else {
      return 'indie'; // Anything that doesn't have a genre is 'indie'
    }
  } catch (err) {
    logger.log('err', `Error getting genre: ${err}`);
  }
}

async function refreshTracksList() {
  await spotify.refreshAccessToken().then(
    function (data) {
      spotify.setAccessToken(data.body['access_token']);
    },
    function (err) {
      logger.log('err', `Could not refresh access token: ${err}`);
    }
  );

  return spotify.getPlaylistTracks(process.env.S_PLAYLIST).then(
    async function (data) {
      let temp = [];
      for (let i = 0; i < data.body.items.length; i++) {
        const track = data.body.items[i].track;
        const artist = track.artists[0].name;
        const id = track.id;
        const song = track.name;

        if (cachedTracks.includes(id) || postedTracks.includes(id) || notPostedTracks.some(inner => inner[0] === id)) {
          logger.log('warn', `Track ${artist} - ${song} already posted or previously failed to post (notPosted.json); removing from playlist.`);
          await removeTrackFromPlaylist(process.env.S_PLAYLIST, id);
        } else {
          logger.log('info', `Adding ${artist} - ${song}`);

          const genre = await getGenre(track.artists[0])
          temp.push({ postTitle: `${artist} - ${song} [${genre}] (${track.album.release_date.substring(0, 4)})`, id: id });
        }
      }
      return temp;
    },
    function (err) {
      logger.log('err', err);
    }
  );
}

async function removeTrackFromPlaylist(playlistId, trackId) {
  try {
    await spotify.removeTracksFromPlaylist(playlistId, [{ uri: `spotify:track:${trackId}` }]);
  } catch (err) {
    logger.log('err', `Error removing track: ${err}`);
  }
}

async function searchYoutube(query) {
  const apiKey = process.env.Y_API_KEY;
  const apiUrl = "https://www.googleapis.com/youtube/v3/search";

  const maxResults = 1;
  const requestUrl = `${apiUrl}?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}`;

  try {
    const response = await fetch(requestUrl);
    const data = await response.json();

    if (response.ok) {
      const videos = data.items;

      const titleWithoutEntities = he.decode(videos[0].snippet.title);
      let similarity = stringSimilarity.compareTwoStrings(titleWithoutEntities.toLowerCase(), query.toLowerCase());
      logger.log('info', `Youtube returned ${titleWithoutEntities}, has a similarity of ${similarity} to ${query}`);

      if (similarity <= STRING_SIMILARITY_THRESHOLD) {
        // Retry comparison with channel name, minus '- Topic' for autogenerated music channels
        const withChannelTitle = videos[0].snippet.channelTitle.split('-')[0] + '- ' + videos[0].snippet.title;
        similarity = stringSimilarity.compareTwoStrings(withChannelTitle.toLowerCase(), query.toLowerCase());
        logger.log('info', `With channel title, new similarity score is ${similarity}: ${withChannelTitle}`);
      }

      return similarity > STRING_SIMILARITY_THRESHOLD ? `https://www.youtube.com/watch?v=${videos[0].id.videoId}` : '';
    } else {
      logger.log('err', `Error: ${response.statusText}`);
    }
  } catch (error) {
    logger.log('err', 'Error fetching data:', error);
  }
}

function postRedditLink(title, link, subreddit) {
  reddit.getSubreddit(subreddit).submitLink({
    title: title,
    url: link,
    sendReplies: false
  });
}

const initialWait = 15000;

const targetSubreddit = process.env.TARGET_SUBREDDIT;
const postingInterval = parseInt(process.env.POSTING_INTERVAL);
let fuzzTime = parseInt(process.env.FUZZ_TIME);
fuzzTime = Math.abs(fuzzTime);

setTimeout(async () => {
  await main();
  setInterval(main, postingInterval + Math.floor(Math.random() * fuzzTime));
}, initialWait);

async function main() {
  if (cachedTracks.length <= 0) {
    cachedTracks = await refreshTracksList();
  }

  if (cachedTracks.length <= 0) {
    logger.log('info', `[${getTimeStamp()}] No new tracks to post! Trying again at ${getTimeStamp(postingInterval).toLocaleString()}`)
    return;
  }

  const cachedTrack = cachedTracks[cachedTracks.length - 1];

  if (!postedTracks.includes(cachedTrack.id)) {
    const url = await searchYoutube(cachedTrack.postTitle.split('[')[0]); // Search without genre name and year

    if (url != '') {
      postRedditLink(cachedTrack.postTitle, url, targetSubreddit);
      logger.log('success', `[${getTimeStamp()}] Posted ${cachedTrack.postTitle} from ${url}`);

      postedTracks.push(cachedTrack.id);
      saveTracks(postedJson, postedTracks);
    } else {
      logger.log('warn', `[${getTimeStamp()}] Failed to post ${cachedTrack.postTitle}; adding to notPosted.json`);

      notPostedTracks.push([cachedTrack.id, cachedTrack.postTitle, url]);
      saveTracks(notPostedJson, notPostedTracks);
    }
  } else {
    logger.log('warn', `Track ${cachedTrack.postTitle} already posted; removing from playlist.`)
  }

  removeTrackFromPlaylist(process.env.S_PLAYLIST, cachedTrack.id);
  cachedTracks.pop();
}

logger.log('success', (`Posting interval set to ${postingInterval / 1000 / 60 / 60} hour(s)`
  + (fuzzTime > 0 ? ` plus a random amount < ${Math.ceil(fuzzTime / 1000 / 60)} minute(s).` : '.')
  + ` Waiting ${ initialWait / 1000} seconds before first post...`));