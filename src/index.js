require('dotenv').config();
const express = require('express');
const runAccountBot = require('./bots/account.bot');
const runPostBot = require('./bots/post.bot');
const logger = require('./utils/logger');
const http = require('./utils/http');

const app = express();
const PORT = process.env.PORT || process.env.PORT || 10000;

/* ====================== Express Server ====================== */
app.get('/', (req, res) => res.send('🤖 Bot is running'));
app.listen(PORT, () => console.log(`🌐 Web Service listening on port ${PORT}`));

/* ====================== KeepAlive مستمرة ====================== */
async function keepAliveForever() {
  try {
    await http.get(process.env.SITE_URL);
    logger.info('✅ KeepAlive sent');
  } catch (err) {
    logger.error('❌ KeepAlive error:', err.message);
  } finally {
    setTimeout(keepAliveForever, 60 * 1000); // كل دقيقة
  }
}
keepAliveForever();

/* ====================== Counters يومية ====================== */
let accountsRunToday = 0;
let postsRunToday = 0;
const DAILY_ACCOUNT_LIMIT = 50;
const DAILY_POST_LIMIT = 2;

function resetDailyCounters() {
  accountsRunToday = 0;
  postsRunToday = 0;
  logger.info('🔄 Daily counters reset');
}

// تحقق يوميًا إذا دخلنا يوم جديد
let lastDay = new Date().getDate();
setInterval(() => {
  const now = new Date();
  if (now.getDate() !== lastDay) {
    lastDay = now.getDate();
    resetDailyCounters();
  }
}, 60 * 1000);

/* ====================== Run Bots يوميًا ====================== */

// ⚠️ ملاحظة مهمة: على Render من الأفضل تشغيل بوت واحد لكل مرة لتجنب ETXTBSY
async function runAccountsDaily() {
  if (accountsRunToday >= DAILY_ACCOUNT_LIMIT) return;

  const remaining = DAILY_ACCOUNT_LIMIT - accountsRunToday;

  for (let i = 0; i < remaining; i++) {
    try {
      logger.info(`👤 Running Account Bot (${i + 1}/${remaining})`);
      await runAccountBot(1); // حساب واحد فقط في كل مرة
      accountsRunToday += 1;
      await new Promise(r => setTimeout(r, 5000)); // استراحة 5 ثواني بين كل حساب
    } catch (err) {
      logger.error('❌ Account bot error: ' + err.message);
    }
  }
}

async function runPostsDaily() {
  if (postsRunToday >= DAILY_POST_LIMIT) return;

  for (let i = 0; i < DAILY_POST_LIMIT; i++) {
    try {
      logger.info(`📝 Running Post Bot (${postsRunToday + 1}/${DAILY_POST_LIMIT})`);
      await runPostBot(1); // منشور واحد فقط في كل مرة
      postsRunToday += 1;
      await new Promise(r => setTimeout(r, 5000)); // استراحة بسيطة بين المنشورات
    } catch (err) {
      logger.error('❌ Post bot error: ' + err.message);
    }
  }
}

/* ====================== تشغيل أولي ====================== */
runAccountsDaily();
runPostsDaily();

/* ====================== جدولة على Web Service ====================== */
// Render Web Service أفضل أن يشغّل بوت واحد كل مرة بدلاً من تشغيل دفعة
setInterval(runAccountsDaily, 60 * 60 * 1000); // كل ساعة للتحقق من الحسابات
setInterval(runPostsDaily, 12 * 60 * 60 * 1000); // كل 12 ساعة للتحقق من المنشورات

logger.info('🚀 Bot system started and running on Render Web Service');
