require('dotenv').config();
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');
const FormData = require('form-data');
const fetch = require('node-fetch');
const logger = require('../utils/logger');
const { addAccount, getRandomAccount } = require('../utils/accountManager');
const Post = require('./Posts.js'); // عدّل المسار حسب مشروعك

const SITE_URL = process.env.SITE_URL;

/* =========================
   توليد مستخدم وهمي
========================= */
function generateUser() {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: faker.internet.password({ length: 12 })
  };
}

/* =========================
   كتابة بطيئة لمحاكاة الإنسان
========================= */
async function humanType(element, text) {
  for (const char of text) {
    await element.type(char);
    await new Promise(r => setTimeout(r, 80 + Math.random() * 70));
  }
}

/* =========================
   انتظار
========================= */
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* =========================
   جلب منشورات عشوائية من قاعدة البيانات
========================= */
async function getRandomPostsFromDB(n) {
  const posts = await Post.aggregate([{ $sample: { size: n } }]);
  return posts;
}

/* =========================
   جلب تعليق عشوائي
========================= */
const comments = [
  "Awesome post! 😍",
  "Love this! 💖",
  "Great content! 👏",
  "This is amazing! 🔥",
  "Keep it up! 💯",
  "Super interesting! 🤩",
  "Thanks for sharing! 🙌"
];
function getRandomComment() {
  return comments[Math.floor(Math.random() * comments.length)];
}

/* =========================
   البوت الرئيسي
========================= */
async function runAccountAndEngagementBot(postsPerRun = 3, delayBetween = 2000) {
  logger.info('👤 Account bot started');
  const user = generateUser();

  const browser = await puppeteer.launch({
  args: [
    ...chromium.args,
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--single-process"
  ],
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: true
});



  let cookies = null;

  try {
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);

    // ========================= REGISTER =========================
    logger.info('🔗 Opening register page');
    await page.goto(`${SITE_URL}/auth/register`, { waitUntil: 'networkidle2' });

    const registerInputs = await page.$$('form input');
    const registerBtn = await page.$('form button');

    if (registerInputs.length < 3 || !registerBtn) {
      throw new Error('❌ Register form not found');
    }

    logger.info('✍️ Filling registration form');
    await humanType(registerInputs[0], user.name);
    await humanType(registerInputs[1], user.email);
    await humanType(registerInputs[2], user.password);

    await wait(500 + Math.random() * 500);
    await registerBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    logger.info(`✅ Account created successfully: ${user.email}`);

    // ========================= LOGIN =========================
    logger.info('🔁 Opening login page');
    await page.goto(`${SITE_URL}/auth/login`, { waitUntil: 'networkidle2' });

    const loginInputs = await page.$$('form input');
    const loginBtn = await page.$('form button');

    if (loginInputs.length < 2 || !loginBtn) {
      throw new Error('❌ Login form not found');
    }

    logger.info('✍️ Filling login form');
    await humanType(loginInputs[0], user.email);
    await humanType(loginInputs[1], user.password);

    await wait(400 + Math.random() * 400);
    await loginBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    logger.info(`🔓 Logged in successfully: ${user.email}`);

    // ========================= SAVE ACCOUNT =========================
    cookies = await page.cookies();
    addAccount({ name: user.name, email: user.email, password: user.password, cookies });
    logger.info('💾 Account saved with session cookies');

  } catch (err) {
    logger.error('❌ Account bot error: ' + err.message);
  } finally {
    await browser.close();
    logger.info('👤 Account bot finished');
  }

  // ========================= Engagement Bot =========================
  if (!cookies || cookies.length === 0) {
    logger.error('❌ No session cookies available. Cannot engage with posts.');
    return;
  }

  logger.info('❤️ Running Engagement Bot');

  // 🔌 Connect MongoDB
  await mongoose.connect(process.env.MONGO_URI);

  const totalPosts = await Post.countDocuments();
  console.log(`📊 Total posts in database: ${totalPosts}`);

  if (totalPosts === 0) {
    logger.error('❌ No posts found in DB');
    await mongoose.disconnect();
    return;
  }

  const posts = await getRandomPostsFromDB(postsPerRun);

  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  for (const post of posts) {
    try {
      console.log(`🔗 Engaging with post: ${post._id}`);

      // ❤️ Like
      try {
        const likeRes = await fetch(`${SITE_URL}/posts/like/${post._id}`, {
          method: 'POST',
          headers: { 'Cookie': cookieHeader, 'Accept': 'application/json' }
        });
        const likeText = await likeRes.text();
        if (!likeRes.ok) console.log('❌ Failed to like post:', likeRes.status, likeText);
        else console.log('❤️ Liked post');
      } catch (err) {
        console.log('❌ Like request error:', err.message);
      }

      await wait(delayBetween + Math.random() * 2000);

      // 💬 Comment
      try {
        const commentText = getRandomComment();
        const form = new FormData();
        form.append('text', commentText);

        const commentRes = await fetch(`${SITE_URL}/posts/comment/${post._id}`, {
          method: 'POST',
          headers: { 'Cookie': cookieHeader },
          body: form
        });
        const commentBody = await commentRes.text();
        if (!commentRes.ok) console.log('❌ Failed to comment:', commentRes.status, commentBody);
        else console.log('💬 Comment added:', commentText);
      } catch (err) {
        console.log('❌ Comment request error:', err.message);
      }

      await wait(delayBetween + Math.random() * 2000);
    } catch (err) {
      console.log('❌ Engagement error for post', post._id, ':', err.message);
    }
  }

  logger.info('🎉 Engagement bot finished for all posts!');
  await mongoose.disconnect();
}

module.exports = runAccountAndEngagementBot;

