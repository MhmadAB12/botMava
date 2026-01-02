require('dotenv').config();
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { getRandomAccount } = require('../utils/accountManager');
const Post = require('./Posts.js'); // عدّل المسار حسب مشروعك

const SITE_URL = process.env.SITE_URL;

/* =========================
   ⏳ انتظار
========================= */
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* =========================
   جلب منشورات عشوائية من قاعدة البيانات
========================= */
async function getRandomPostsFromDB(n) {
  const posts = await Post.aggregate([{ $sample: { size: n } }]); // اختيار عشوائي مضمون
  return posts; // مصفوفة فارغة إذا لم يوجد أي منشورات
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
   تشغيل البوت المتقدم
========================= */
async function runAdvancedEngagementBot(postsPerRun = 3, delayBetween = 2000) {
  const account = getRandomAccount();
  if (!account) {
    console.log('❌ No account found');
    return;
  }

  console.log(`🤖 Using account: ${account.username || account.email}`);

  // 🔌 ربط MongoDB
  await mongoose.connect(process.env.MONGO_URI);

  // 📊 عرض عدد المنشورات في قاعدة البيانات
  const totalPosts = await Post.countDocuments();
  console.log(`📊 Total posts in database: ${totalPosts}`);

  // جلب منشورات عشوائية
  const posts = await getRandomPostsFromDB(postsPerRun);
  if (!posts.length) {
    console.log('❌ No posts found in DB');
    await mongoose.disconnect();
    return;
  }

  const cookies = account.cookies?.join('; ');
  if (!cookies) {
    console.log('❌ Account has no cookies');
    await mongoose.disconnect();
    return;
  }

  for (const post of posts) {
    try {
      console.log(`🔗 Engaging with post: ${post._id}`);

      // ❤️ Like
      const likeRes = await fetch(`${SITE_URL}/posts/like/${post._id}`, {
        method: 'POST',
        headers: { 'Cookie': cookies, 'Accept': 'application/json' }
      });

      if (likeRes.ok) console.log('❤️ Liked post');
      else console.log('❌ Failed to like post');

      await wait(delayBetween + Math.random() * 2000);

      // 💬 Comment
      const commentText = getRandomComment();
      const form = new FormData();
      form.append('text', commentText);

      const commentRes = await fetch(`${SITE_URL}/posts/comment/${post._id}`, {
        method: 'POST',
        headers: { 'Cookie': cookies },
        body: form
      });

      if (commentRes.ok) console.log('💬 Comment added:', commentText);
      else console.log('❌ Failed to add comment');

      await wait(delayBetween + Math.random() * 2000);

    } catch (err) {
      console.log('❌ Engagement error for post', post._id, ':', err.message);
    }
  }

  console.log('🎉 Engagement bot finished for all posts!');
  await mongoose.disconnect();
}

module.exports = runAdvancedEngagementBot;
