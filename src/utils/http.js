const axios = require('axios');

const http = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'SocialBot/1.0'
  }
});

module.exports = http;
