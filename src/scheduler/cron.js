const runAccountBot = require('../bots/account.bot');
const runPostBot = require('../bots/post.bot');
const logger = require('../utils/logger');
const http = require('../utils/http');

let accountsRunToday = 0;
let postsRunToday = 0;

const DAILY_ACCOUNT_LIMIT = 50;
const DAILY_POST_LIMIT = 2;

/* ======================
   ⏱️ RESET AT MIDNIGHT
====================== */
function resetDailyCounters() {
  accountsRunToday = 0;
  postsRunToday = 0;
  logger.info('🔄 Daily counters reset');
}

// تحقق كل دقيقة إذا دخلنا يوم جديد
let lastDay = new Date().getDate();
setInterval(() => {
  const now = new Date();
  if (now.getDate() !== lastDay) {
    lastDay = now.getDate();
    resetDailyCounters();
  }
}, 60 * 1000);

/* ======================
   👤 ACCOUNT BOT (50 / DAY)
====================== */
async function runAccountsDaily() {
  if (accountsRunToday >= DAILY_ACCOUNT_LIMIT) return;

  const remaining = DAILY_ACCOUNT_LIMIT - accountsRunToday;
  logger.info(`👤 Running Account Bot (${remaining} remaining today)`);

  await runAccountBot(remaining);
  accountsRunToday = DAILY_ACCOUNT_LIMIT;
}

/* ======================
   📝 POST BOT (2 / DAY)
====================== */
async function runPostsDaily() {
  if (postsRunToday >= DAILY_POST_LIMIT) return;

  logger.info(`📝 Running Post Bot (${postsRunToday + 1}/${DAILY_POST_LIMIT})`);
  await runPostBot(1);
  postsRunToday += 1;
}

/* ======================
   🔁 KEEP ALIVE (EVERY MINUTE, 5 REQUESTS)
====================== */
async function keepAlive() {
  try {
    for (let i = 0; i < 5; i++) {
      await http.get(process.env.SITE_URL);
    }
    logger.info('✅ KeepAlive sent 5 requests');
  } catch (err) {
    logger.error('❌ KeepAlive error:', err.message);
  }
}

/* ======================
   ⏰ SCHEDULING
====================== */

// الحسابات: مرة واحدة يوميًا
setInterval(runAccountsDaily, 60 * 60 * 1000); // يفحص كل ساعة

// البوستات: مرتين يوميًا (كل 12 ساعة)
setInterval(runPostsDaily, 12 * 60 * 60 * 1000);

// KeepAlive: كل دقيقة
setInterval(keepAlive, 60 * 1000);

// تشغيل أولي عند التشغيل
runAccountsDaily();
runPostsDaily();
keepAlive();

logger.info('🚀 Bot system started and running 24/7');
