require('dotenv').config();

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');
const FormData = require('form-data');
const fetch = require('node-fetch');
const logger = require('../utils/logger');
const { addAccount } = require('../utils/accountManager');
const Post = require('./Posts.js');

const SITE_URL = process.env.SITE_URL;

/* =========================
   🔒 Lock لمنع التشغيل المتكرر
========================= */
let isRunning = false;

/* =========================
   أدوات مساعدة
========================= */
const wait = ms => new Promise(r => setTimeout(r, ms));

async function humanType(element, text) {
  for (const char of text) {
    await element.type(char);
    await wait(80 + Math.random() * 70);
  }
}

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
   تعليقات
========================= */
const comments = [
  "Awesome post!",
  "Love this!",
  "Great content!",
  "This is amazing!",
  "Keep it up!",
  "Super interesting!",
  "Thanks for sharing!"
];

const getRandomComment = () =>
  comments[Math.floor(Math.random() * comments.length)];

/* =========================
   جلب منشورات عشوائية
========================= */
async function getRandomPostsFromDB(n) {
  return Post.aggregate([{ $sample: { size: n } }]);
}

/* =========================
   البوت الرئيسي
========================= */
async function runAccountAndEngagementBot(postsPerRun = 3, delayBetween = 2000) {
  if (isRunning) {
    logger.warn('⚠️ Bot already running, skipping');
    return;
  }

  isRunning = true;
  let browser;
  let cookies = null;

  try {
    logger.info('👤 Account bot started');
    const user = generateUser();

    /* =========================
       Chromium (مهم لـ Render)
    ========================= */
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    /* =========================
       REGISTER
    ========================= */
    await page.goto(`${SITE_URL}/auth/register`, { waitUntil: 'networkidle2' });

    const registerInputs = await page.$$('form input');
    const registerBtn = await page.$('form button');
    if (registerInputs.length < 3 || !registerBtn) {
      throw new Error('Register form not found');
    }

    await humanType(registerInputs[0], user.name);
    await humanType(registerInputs[1], user.email);
    await humanType(registerInputs[2], user.password);

    await wait(500);
    await registerBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    logger.info(`✅ Account created: ${user.email}`);

    /* =========================
       LOGIN
    ========================= */
    await page.goto(`${SITE_URL}/auth/login`, { waitUntil: 'networkidle2' });

    const loginInputs = await page.$$('form input');
    const loginBtn = await page.$('form button');
    if (loginInputs.length < 2 || !loginBtn) {
      throw new Error('Login form not found');
    }

    await humanType(loginInputs[0], user.email);
    await humanType(loginInputs[1], user.password);

    await wait(400);
    await loginBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    logger.info(`🔓 Logged in: ${user.email}`);

    /* =========================
       SAVE ACCOUNT
    ========================= */
    cookies = await page.cookies();
    addAccount({ ...user, cookies });

    logger.info('💾 Account saved');

    /* تهدئة قبل الإغلاق */
    await wait(3000);
  } catch (err) {
    logger.error('❌ Account bot error: ' + err.message);
  } finally {
    if (browser) await browser.close();
    logger.info('👤 Account bot finished');
  }

  /* =========================
     Engagement Bot
  ========================= */
  if (!cookies || cookies.length === 0) {
    logger.error('❌ No cookies, engagement skipped');
    isRunning = false;
    return;
  }

  logger.info('❤️ Engagement bot started');

  await mongoose.connect(process.env.MONGO_URI);

  const posts = await getRandomPostsFromDB(postsPerRun);
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  for (const post of posts) {
    try {
      /* ❤️ Like */
      await fetch(`${SITE_URL}/posts/like/${post._id}`, {
        method: 'POST',
        headers: { Cookie: cookieHeader }
      });

      await wait(delayBetween);

      /* 💬 Comment */
      const form = new FormData();
      form.append('text', getRandomComment());

      await fetch(`${SITE_URL}/posts/comment/${post._id}`, {
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: form
      });

      await wait(delayBetween);
    } catch (err) {
      logger.error(`❌ Engagement error: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  logger.info('🎉 Engagement finished');

  isRunning = false;
}

module.exports = runAccountAndEngagementBot;
