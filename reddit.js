require('dotenv').config();
const spotifyWebApi = require('spotify-web-api-node');
const snoowrap = require("snoowrap");

const spotify = new spotifyWebApi({
  clientId: process.env.S_CLIENT_ID,
  clientSecret: process.env.S_CLIENT_SECRET,
  redirectUri: 'http://localhost:8888/callback'
});

spotify.setAccessToken(process.env.S_ACCESS_TOKEN);
spotify.setRefreshToken(process.env.S_REFRESH_TOKEN);

const reddit = new snoowrap({
  userAgent: process.env.R_USER_AGENT,
  clientId: process.env.R_CLIENT_ID,
  clientSecret: process.env.R_CLIENT_SECRET,
  refreshToken: process.env.R_REFRESH_TOKEN,
  username: process.env.R_USER,
  password: process.env.R_PASS
});

function refreshTracksList(){

  spotify.getPlaylistTracks(process.env.S_PLAYLIST).then(
    function(data) {
      // console.log("Tony Hawk...", data.body.items);
      for (let i = 0; i < data.body.items.length; i++) {
          console.log(data.body.items[i].track.artists[0].name, '-', data.body.items[i].track.name);
      }
    },
    function(err) {
      console.error(err);
    }
  );
}

function postLink(title, link, subreddit){ 
  reddit.getSubreddit('test_automation').submitLink({
    title: title,
    url: link,
    sendReplies: false
  });
}

let tracks = refreshTracksList();

// let postInterval = setInterval(() => {
//   postLink('test post', 'https://www.wikipedia.org', 'test_automation');
// }, 5000);

// clearInterval(interval); // stops posting