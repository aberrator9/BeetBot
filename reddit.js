require('dotenv').config();
const spotifyWebApi = require('spotify-web-api-node');
const snoowrap = require('snoowrap');
const google = require('googleapis');
const fs = require('fs');

const reddit = new snoowrap({
  userAgent: process.env.R_USER_AGENT,
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

function loadPostedTracks() {
  try {
    const data = fs.readFileSync('postedTracks.json', 'utf8');
    return JSON.parse(data) || [];
  } catch (error) {
    console.error('Error loading posted tracks:', error);
    return [];
  }
}

function savePostedTracks() {
  try {
    fs.writeFileSync('postedTracks.json', JSON.stringify(postedTracks), 'utf8');
  } catch (error) {
    console.error('Error saving posted tracks:', error);
  }
}

let postedTracks = loadPostedTracks();
let tracks = [];
spotify.setRefreshToken(process.env.S_REFRESH_TOKEN);

async function getGenre(artist) {
  try {
    if (artist != undefined) {
      // Assuming the first artist represents the main artist for the track
      const artistId = artist.id;
      const artistInfo = await spotify.getArtist(artistId);

      if (artistInfo.body.genres.length > 0) {
        const genre = artistInfo.body.genres[0];
        return artistInfo.body.genres[0];
      } else {
        return 'indie';
      }
    } else {
      console.warn('No artist provided.');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function refreshTracksList() {
  await spotify.refreshAccessToken().then(
    function (data) {
      console.log('Spotify access token was refreshed at', new Date(Date.now()).toLocaleString());
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
        let track = data.body.items[i].track;

        console.log('Adding', track.artists[0].name, '-', track.name);

        let genre = await getGenre(track.artists[0])
        temp.push(`${track.artists[0].name} - ${track.name} [${genre}] (${track.album.release_date.substring(0, 4)}):${track.id}`);
      }
      return temp;
    },
    function (err) {
      console.error(err);
    }
  );
}

async function removeTrackFromPlaylist(playlistId, trackId) {
  try {
    await spotify.removeTracksFromPlaylist(playlistId, [{ uri: `spotify:track:${trackId}` }]);
  } catch (error) {
    console.error('Error removing track:', error);
  }
}

async function searchYoutube(query) {
  const apiKey = process.env.Y_API_KEY;
  const apiUrl = "https://www.googleapis.com/youtube/v3/search";

  const maxResults = 1;

  // Construct the API request URL
  const requestUrl = `${apiUrl}?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}`;

  try {
    const response = await fetch(requestUrl);
    const data = await response.json();

    if (response.ok) {
      const videos = data.items;

      return `https://www.youtube.com/watch?v=${videos[0].id.videoId}`;
    } else {
      console.error(`Error: ${response.statusText}`);
      console.error(data);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function postRedditLink(title, link, subreddit) {
  reddit.getSubreddit(subreddit).submitLink({
    title: title,
    url: link,
    sendReplies: false
  });
}

let postInterval = setInterval(async () => {

  if (tracks.length <= 0) {
    tracks = await refreshTracksList();
  }

  if (tracks.length <= 0) {
    console.log('---', '\n', `[${new Date(Date.now()).toLocaleString()}] No new tracks to post!`, '\n', '---')
    return;
  }

  // let url = await searchYoutube(tracks[tracks.length - 1]);
  let url = 'https://wikipedia.org';
  let trackAndId = tracks[tracks.length - 1].split(':');

  if (!postedTracks.includes(trackAndId[1])) {
    // postRedditLink(trackAndId[0], url, 'test_automation');
    console.log(`[${new Date(Date.now()).toLocaleString()}]`, 'Posted', trackAndId[0], `from ${url}`);

    postedTracks.push(trackAndId[1]);
    savePostedTracks();
  } else {
    console.warn('Track', trackAndId, 'already posted; removing from playlist.')
  }

  removeTrackFromPlaylist(process.env.S_PLAYLIST, trackAndId[1]);
  tracks.pop();
}, 3000);

// clearInterval(interval); // stops posting