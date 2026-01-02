const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const SESSIONS_DIR = path.join(__dirname, '../../sessions');

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR);
}

/**
 * تحميل الكوكيز
 */
async function loadSession(page, sessionName) {
  const file = path.join(SESSIONS_DIR, `${sessionName}.json`);
  if (!fs.existsSync(file)) return false;

  const cookies = JSON.parse(fs.readFileSync(file, 'utf8'));
  await page.setCookie(...cookies);
  logger.info(`🍪 Session loaded: ${sessionName}`);
  return true;
}

/**
 * حفظ الكوكيز
 */
async function saveSession(page, sessionName) {
  const cookies = await page.cookies();
  const file = path.join(SESSIONS_DIR, `${sessionName}.json`);
  fs.writeFileSync(file, JSON.stringify(cookies, null, 2));
  logger.info(`💾 Session saved: ${sessionName}`);
}

module.exports = {
  loadSession,
  saveSession
};
