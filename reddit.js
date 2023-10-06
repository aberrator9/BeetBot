require('dotenv').config();
const spotifyWebApi = require('spotify-web-api-node');
const snoowrap = require('snoowrap');
const google = require('googleapis');

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

let tracks = [];
spotify.setRefreshToken(process.env.S_REFRESH_TOKEN);

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
    function (data) {
      let temp = [];
      for (let i = 0; i < data.body.items.length; i++) {
        console.log('Adding', data.body.items[i].track.artists[0].name, '-', data.body.items[i].track.name);
        temp.push(`${data.body.items[i].track.artists[0].name} - ${data.body.items[i].track.name}`);
      }
      return temp;
    },
    function (err) {
      console.error(err);
    }
  );
}

async function searchYoutube(query) {
  const apiKey = process.env.Y_API_KEY;
  const apiUrl = "https://www.googleapis.com/youtube/v3/search";
  
  const maxResults = 1; // Adjust as needed
  
  // Construct the API request URL
  const requestUrl = `${apiUrl}?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}`;
  
  try {
    const response = await fetch(requestUrl);
    const data = await response.json();
    
    if (response.ok) {
      const videos = data.items;
      
      // Process and display video information
      videos.forEach(video => {
        console.log(`Title: ${video.snippet.title}`);
        console.log(`Video ID: ${video.id.videoId}`);
        console.log("---");
      });
      
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
    console.warn('Track list is empty!')
    return;
  }

  let url = await searchYoutube(tracks[tracks.length - 1]);
  postRedditLink('tracks[0]', url, 'test_automation');
  console.log('Posted', tracks[tracks.length - 1], `from ${url}`);

  tracks.pop();
}, 3000);

// clearInterval(interval); // stops posting