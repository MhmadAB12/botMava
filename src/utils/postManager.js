const fs = require('fs');
const path = require('path');

const POSTS_PATH = path.join(__dirname, '../data/posts.published.json');

function getRandomPostId() {
  if (!fs.existsSync(POSTS_PATH)) return null;

  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));
  if (!posts.length) return null;

  return posts[Math.floor(Math.random() * posts.length)]._id;
}

module.exports = { getRandomPostId };
