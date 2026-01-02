// src/utils/accountManager.js
const fs = require('fs');
const path = require('path');

const accountsFile = path.join(__dirname, '../data/accounts.json');
const ACCOUNTS_PATH = path.join(__dirname, '../data/accounts.json');

let accounts = [];

// تحميل الحسابات من ملف JSON
function loadAccounts() {
  if (fs.existsSync(accountsFile)) {
    accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf-8'));
  }
}
function getLastAccount() {
  if (!fs.existsSync(ACCOUNTS_PATH)) return null;
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf8'));
  if (!accounts.length) return null;
  return accounts[accounts.length - 1];
}


// حفظ الحسابات في الملف
function saveAccounts() {
  fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, 2));
}

// إضافة حساب جديد
function addAccount(account) {
  accounts.push(account);
  saveAccounts();
}

// تحديث حساب (مثلاً بعد حفظ الكوكيز)
function updateAccount(email, data) {
  const index = accounts.findIndex(acc => acc.email === email);
  if (index !== -1) {
    accounts[index] = { ...accounts[index], ...data };
    saveAccounts();
  }
}

// الحصول على حساب عشوائي
function getRandomAccount() {
  if (!accounts || accounts.length === 0) return null;

  // فلترة الحسابات الصالحة (التي لديها cookies)
  const validAccounts = accounts.filter(
    acc =>
      acc &&
      Array.isArray(acc.cookies) &&
      acc.cookies.length > 0 &&
      acc.email
  );

  if (validAccounts.length === 0) return null;

  const idx = Math.floor(Math.random() * validAccounts.length);
  return validAccounts[idx];
}


// الحصول على حساب معين حسب البريد
function getAccountByEmail(email) {
  return accounts.find(acc => acc.email === email);
}

// تهيئة عند التشغيل
loadAccounts();

module.exports = {
  addAccount,
  updateAccount,
  getRandomAccount,
  getAccountByEmail,
  getLastAccount
};
