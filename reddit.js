'use strict';
const snoowrap = require("snoowrap");
require('dotenv').config();

const r = new snoowrap({
    userAgent: process.env.userAgent,
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    refreshToken: process.env.refreshToken,
    username: process.env.username,
    password: process.env.password
  });

  r.getHot().map(post => post.title).then(console.log);