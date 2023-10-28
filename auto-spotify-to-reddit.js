const dotenv = require('dotenv');
const fetch = require('node-fetch');
const spotifyWebApi = require('spotify-web-api-node');
const snoowrap = require('snoowrap');
const google = require('googleapis');
const fs = require('fs');
const he = require('he');
const stringSimilarity = require("string-similarity");
const { time } = require('console');

const repo = 'https://github.com/aberrator9/automation';
const localEnv = dotenv.config();

function checkForEnvironmentVariables() {
  if (!fs.existsSync('.env')) {
    const envContent = `R_CLIENT_ID=''\nR_CLIENT_SECRET=''\nR_REFRESH_TOKEN=''\nR_ACCESS_TOKEN=''\nR_USER=''\nR_PASS=''\nS_CLIENT_ID=''\nS_CLIENT_SECRET=''\nS_ACCESS_TOKEN=''\nS_REFRESH_TOKEN=''\nS_PLAYLIST=''\nY_API_KEY=''`;
    fs.writeFileSync('.env', envContent);
    console.log(`.env file created in local directory, but you will need to finish setting it up! See ${repo} for setup instructions.`)
    console.log('Exiting...');
    process.exit();
  } else {
    const missingValues = Object.entries(localEnv.parsed).filter(([key, value]) => value === '');
    if (missingValues.length > 0) {
      console.log(`.env file is missing required values! See ${repo} for setup instructions.`);
      console.log('Exiting...');
      process.exit();
    }
    else {
      console.log('.env file found in local directory.');
    }
  }
}

function checkForFile(filename) {
  if(!fs.existsSync(filename)) {
    fs.writeFileSync(filename, filename.includes('json') ? '[]' : '');
  }
  return filename;
}

checkForEnvironmentVariables();
const postedJson = checkForFile('posted.json');
const notPostedJson = checkForFile('notPosted.json');
const logFile = checkForFile('logs/beetbot.log');
const sessionLogFile = checkForFile(`logs/beetbot.${Date.now()}.log`);

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

function loadPostedTracks() {
  try {
    const data = fs.readFileSync(postedJson, 'utf8');
    return JSON.parse(data) || [];
  } catch (error) {
    console.log('Error loading posted tracks:', error);
    return [];
  }
}

function savePostedTracks() {
  try {
    fs.writeFileSync(postedJson, JSON.stringify(postedTracks), 'utf8');
  } catch (error) {
    console.log('Error saving posted tracks:', error);
  }
}

const postedTracks = loadPostedTracks();
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
  } catch (error) {
    console.log('Error:', error);
  }
}

async function refreshTracksList() {
  await spotify.refreshAccessToken().then(
    function (data) {
      spotify.setAccessToken(data.body['access_token']);
    },
    function (err) {
      console.log('Could not refresh access token', err);
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

        if (cachedTracks.includes(id) || postedTracks.includes(id)) {
          console.log('Track', `${artist} - ${song}`, 'already posted; removing from playlist.')
          await removeTrackFromPlaylist(process.env.S_PLAYLIST, id);
        } else {
          console.log('Adding', artist, '-', song);

          const genre = await getGenre(track.artists[0])
          temp.push({ postTitle: `${artist} - ${song} [${genre}] (${track.album.release_date.substring(0, 4)})`, id: id });
        }
      }
      return temp;
    },
    function (err) {
      console.log(err);
    }
  );
}

async function removeTrackFromPlaylist(playlistId, trackId) {
  try {
    await spotify.removeTracksFromPlaylist(playlistId, [{ uri: `spotify:track:${trackId}` }]);
  } catch (error) {
    console.log('Error removing track:', error);
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
      console.log(`Youtube returned ${titleWithoutEntities}, has a similarity of ${similarity} to ${query}`);

      if (similarity <= STRING_SIMILARITY_THRESHOLD) {
        // Retry comparison with channel name
        const withChannelTitle = videos[0].snippet.channelTitle.split('-')[0] + '- ' + videos[0].snippet.title;
        similarity = stringSimilarity.compareTwoStrings(withChannelTitle.toLowerCase(), query.toLowerCase());
        // Check with channel title, minus '- Topic' for autogenerated music channels
        console.log('With channel title, new similarity score is ', similarity, withChannelTitle);
      }

      return similarity > STRING_SIMILARITY_THRESHOLD ? `https://www.youtube.com/watch?v=${videos[0].id.videoId}` : '';
    } else {
      console.log(`Error: ${response.statusText}`);
    }
  } catch (error) {
    console.log("Error fetching data:", error);
  }
}

function postRedditLink(title, link, subreddit) {
  reddit.getSubreddit(subreddit).submitLink({
    title: title,
    url: link,
    sendReplies: false
  });
}

// const postInterval = 28800000; // 8 hrs
const postInterval = 5000;

setInterval(async () => {

  if (cachedTracks.length <= 0) {
    cachedTracks = await refreshTracksList();
  }

  if (cachedTracks.length <= 0) {
    console.log('---\n', `[${getTimeStamp()}] No new tracks to post! Trying again at ${getTimeStamp(postInterval).toLocaleString()}`)
    return;
  }

  const cachedTrack = cachedTracks[cachedTracks.length - 1];

  if (!postedTracks.includes(cachedTrack.id)) {
    const url = await searchYoutube(cachedTrack.postTitle.split('[')[0]); // Search without genre name and year

    if (url != '') {
      postRedditLink(cachedTrack.postTitle, url, 'test_automation'); // My private subreddit for testing. Request invite here: TODO
      // ... 'Music');          // Check subreddit rules for each, fairly strict
      // ... 'listentothis');

      console.log('---\n', `[${getTimeStamp()}]`, 'Posted', cachedTrack.postTitle, `from ${url}`);

      postedTracks.push(cachedTrack.id);
      savePostedTracks();
    }
  } else {
    console.log('Track', cachedTrack.postTitle, 'already posted; removing from playlist.')
  }

  removeTrackFromPlaylist(process.env.S_PLAYLIST, cachedTrack.id);
  cachedTracks.pop();
}, postInterval);
// }, postInterval + Math.floor(Math.random() * 3600000));

console.log(`Script started at ${getTimeStamp()}; first post will occur at ${getTimeStamp(postInterval).toLocaleString()} plus a random amount < 1 hr.`);
