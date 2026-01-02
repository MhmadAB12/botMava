require('dotenv').config();
const express = require('express');
const runAccountBot = require('./bots/account.bot');
const runPostBot = require('./bots/post.bot');
const logger = require('./utils/logger');
const http = require('./utils/http');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('🤖 Bot is running'));
app.listen(PORT, () => console.log(`🌐 Web Service listening on port ${PORT}`));

/* ================= KeepAlive داخلي + زيارات مستمرة ================= */
async function keepAliveForever() {
  try {
    await http.get(process.env.SITE_URL); // زيارة الموقع
    logger.info('✅ KeepAlive sent');
  } catch (err) {
    logger.error('❌ KeepAlive error:', err.message);
  } finally {
    setTimeout(keepAliveForever, 60 * 1000); // كل دقيقة
  }
}
keepAliveForever();

/* ================= تشغيل البوتات اليومية ================= */
let accountsRunToday = 0;
let postsRunToday = 0;
const DAILY_ACCOUNT_LIMIT = 50;
const DAILY_POST_LIMIT = 2;

function resetDailyCounters() {
  accountsRunToday = 0;
  postsRunToday = 0;
  logger.info('🔄 Daily counters reset');
}

// تحقق كل دقيقة إذا دخل يوم جديد
let lastDay = new Date().getDate();
setInterval(() => {
  const now = new Date();
  if (now.getDate() !== lastDay) {
    lastDay = now.getDate();
    resetDailyCounters();
  }
}, 60 * 1000);

async function runAccountsDaily() {
  if (accountsRunToday >= DAILY_ACCOUNT_LIMIT) return;
  await runAccountBot(DAILY_ACCOUNT_LIMIT - accountsRunToday);
  accountsRunToday = DAILY_ACCOUNT_LIMIT;
}

async function runPostsDaily() {
  if (postsRunToday >= DAILY_POST_LIMIT) return;
  await runPostBot(1);
  postsRunToday += 1;
}

// تشغيل أولي
runAccountsDaily();
runPostsDaily();

// تشغيل مجدول على Web Service
setInterval(runAccountsDaily, 60 * 60 * 1000); // كل ساعة
setInterval(runPostsDaily, 12 * 60 * 60 * 1000); // كل 12 ساعة
