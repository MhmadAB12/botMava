require('dotenv').config();

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { getLastAccount } = require('../utils/accountManager');

const SITE_URL = process.env.SITE_URL;
const POSTS_PATH = path.join(__dirname, '../data/posts.json');
const IMAGES_PATH = path.join(__dirname, '../data/images');
const LAST_IMAGE_FILE = path.join(__dirname, '../data/lastImage.json');

/* =========================
   🔒 Lock لمنع التشغيل المتكرر
========================= */
let isRunning = false;

/* =========================
   أدوات مساعدة
========================= */
const wait = ms => new Promise(r => setTimeout(r, ms));

async function humanType(el, text) {
  for (const c of text) {
    await el.type(c);
    await wait(70 + Math.random() * 60);
  }
}

/* =========================
   جلب منشور عشوائي
========================= */
function getRandomPost() {
  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));
  return posts[Math.floor(Math.random() * posts.length)];
}

/* =========================
   جلب الصورة التالية بالتسلسل
========================= */
function getNextImage() {
  const imgs = fs.readdirSync(IMAGES_PATH)
    .filter(f => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();

  if (!imgs.length) {
    throw new Error('No images found');
  }

  let lastImage = null;

  if (fs.existsSync(LAST_IMAGE_FILE)) {
    try {
      const content = fs.readFileSync(LAST_IMAGE_FILE, 'utf8').trim();
      if (content) {
        lastImage = JSON.parse(content).lastImage;
      }
    } catch {
      lastImage = null;
    }
  }

  let nextIndex = 0;
  if (lastImage) {
    const lastIndex = imgs.indexOf(lastImage);
    if (lastIndex >= 0 && lastIndex < imgs.length - 1) {
      nextIndex = lastIndex + 1;
    }
  }

  const nextImage = imgs[nextIndex];
  fs.writeFileSync(
    LAST_IMAGE_FILE,
    JSON.stringify({ lastImage: nextImage }, null, 2)
  );

  return path.join(IMAGES_PATH, nextImage);
}

/* =========================
   📝 POST BOT
========================= */
async function runPostBot() {
  if (isRunning) {
    logger.warn('⚠️ Post bot already running, skipping');
    return;
  }

  isRunning = true;
  let browser;

  try {
    const account = getLastAccount();
    if (!account) {
      throw new Error('No accounts found');
    }

    logger.info(`📝 Using last account: ${account.email}`);

    const post = getRandomPost();
    if (!post) {
      throw new Error('No posts found');
    }

    /* =========================
       Chromium (آمن لـ Render)
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

    /* ================= LOGIN ================= */
    logger.info('🔐 Logging in');
    await page.goto(`${SITE_URL}/auth/login`, { waitUntil: 'networkidle2' });

    const inputs = await page.$$('form input');
    const loginBtn = await page.$('form button');

    if (inputs.length < 2 || !loginBtn) {
      throw new Error('Login form not found');
    }

    await humanType(inputs[0], account.email);
    await humanType(inputs[1], account.password);
    await wait(500);
    await loginBtn.click();

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    /* ================= CHECK LOGIN ================= */
    await page.goto(`${SITE_URL}/posts/new`, { waitUntil: 'networkidle2' });

    const stillOnLogin = await page.$(
      'form[action="/auth/login"], input[type="password"]'
    );

    if (stillOnLogin) {
      throw new Error('Login failed (redirected back to login)');
    }

    logger.info('✅ Logged in successfully');

    /* ================= NEW POST ================= */
    logger.info('➕ Opening new post page');
    await page.goto(`${SITE_URL}/posts/new`, { waitUntil: 'networkidle2' });

    await page.waitForSelector('textarea', { timeout: 15000 });
    await page.waitForSelector('input[type="file"]');
    await page.waitForSelector('button[type="submit"]');

    const textarea = (await page.$$('textarea'))[0];
    const fileInput = await page.$('input[type="file"]');
    const submit = await page.$('button[type="submit"]');

    /* ================= WRITE ================= */
    logger.info('✍️ Writing post');
    await humanType(textarea, post.content);

    /* ================= IMAGE ================= */
    const image = getNextImage();
    await fileInput.uploadFile(image);

    await wait(1500);
    await submit.click();

    await wait(4000);
    logger.info('✅ Post published successfully');

    /* تهدئة قبل الإغلاق */
    await wait(3000);

  } catch (err) {
    logger.error('❌ Post bot error: ' + err.message);
  } finally {
    if (browser) await browser.close();
    logger.info('📝 Post bot finished');
    isRunning = false;
  }
}

module.exports = runPostBot;
