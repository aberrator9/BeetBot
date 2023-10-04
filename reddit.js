const snoowrap = require("snoowrap");
require('dotenv').config();

function postLink(title, link, subreddit){
  const r = new snoowrap({
    userAgent: process.env.userAgent,
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    refreshToken: process.env.refreshToken,
    username: process.env.username,
    password: process.env.password
  });
  
  r.getSubreddit('test_automation').submitLink({
    title: title,
    url: link,
    sendReplies: false
  });
}

postLink('test post', 'https://www.wikipedia.org', 'test_automation');
