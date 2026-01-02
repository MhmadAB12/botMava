require('dotenv').config();
const fetch = require('node-fetch');
const { getRandomAccount } = require('../utils/accountManager');
const logger = require('../utils/logger');

const SITE_URL = process.env.SITE_URL;

async function runFriendsBotAPI(maxRequests = 5) {
  const account = getRandomAccount();
  if (!account) return logger.error('❌ No accounts found');

  logger.info(`🤝 Friends bot started using account: ${account.email}`);

  const sessionCookie = account.sessionCookie; // استخدم الكوكي من Post Bot

  if (!sessionCookie) {
    logger.error('❌ Session cookie not found, login is required');
    return;
  }

  try {
    // 1️⃣ جلب قائمة المستخدمين
    const usersRes = await fetch(`${SITE_URL}/api/users`, {
      headers: { 'Cookie': `connect.sid=${sessionCookie}` }
    });

    if (!usersRes.ok) {
      const text = await usersRes.text();
      throw new Error(`Failed to fetch users list: ${text.substring(0,200)}`);
    }

    const users = await usersRes.json();
    if (!users.length) return logger.info('ℹ️ No users to follow');

    let followed = 0;

    for (const user of users) {
      if (followed >= maxRequests) break;
      if (user.alreadyFollowing) continue;

      const followRes = await fetch(`${SITE_URL}/users/follow/${user._id}`, {
        method: 'POST',
        headers: { 'Cookie': `connect.sid=${sessionCookie}` }
      });

      if (followRes.ok) {
        followed++;
        logger.info(`➕ Followed user (${followed}/${maxRequests}): ${user.username}`);
      } else {
        const errText = await followRes.text();
        logger.error(`❌ Failed to follow ${user.username}: ${errText}`);
      }

      // انتظار عشوائي لتقليل الحظر
      await new Promise(r => setTimeout(r, 2000 + Math.random()*2000));
    }

    logger.info('✅ Friends bot finished');

  } catch (err) {
    logger.error('❌ Friends bot error: ' + err.message);
  }
}

module.exports = runFriendsBotAPI;
