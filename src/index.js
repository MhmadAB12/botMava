require('dotenv').config();
const express = require('express');
const runBot = require('./bots/post.bot');

const app = express();
const PORT = process.env.PORT || 3000;

/* سيرفر وهمي فقط لربط Port */
app.get('/', (req, res) => {
  res.send('🤖 Bot is running');
});

app.listen(PORT, () => {
  console.log(`🌐 Web Service listening on port ${PORT}`);

  // نشغّل البوت مرة واحدة فقط
  setTimeout(() => {
    runBot(3, 2000);
  }, 5000);
});
