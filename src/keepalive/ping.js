const axios = require('axios');
const logger = require('../utils/logger');

const SITE_URL = process.env.SITE_URL;

async function pingSite() {
  try {
    await axios.get(`${SITE_URL}`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Render-KeepAlive'
      }
    });

    logger.info('✅ KeepAlive ping success');
  } catch (err) {
    logger.error('❌ KeepAlive failed: ' + err.message);
  }
}

module.exports = pingSite;
