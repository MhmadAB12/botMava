const SITE_URL = process.env.SITE_URL;

async function loginWithSession(page, account) {
  if (!account || !account.cookies || !account.cookies.length) {
    throw new Error('No cookies found for this account');
  }

  // 1️⃣ افتح الموقع أولاً (ضروري للـ domain)
  await page.goto(SITE_URL, { waitUntil: 'networkidle2' });

  // 2️⃣ ضع الكوكيز
  await page.setCookie(...account.cookies);

  // 3️⃣ أعد تحميل الصفحة لتفعيل الجلسة
  await page.reload({ waitUntil: 'networkidle2' });
}

module.exports = loginWithSession;
