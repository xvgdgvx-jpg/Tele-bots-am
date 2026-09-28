export default {
  async fetch(request, env, ctx) {
    // التأكد من أن الطلب هو POST من تيليجرام
    if (request.method !== 'POST') {
      return new Response('Bot is running!', { status: 200 });
    }

    try {
      const update = await request.json();

      // التأكد من وجود رسالة
      if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text;
        const from = update.message.from;

        // 1. حفظ المستخدم في قاعدة البيانات (تلقائياً مع كل رسالة)
        const userId = from.id;
        const firstName = from.first_name || '';
        const username = from.username || '';

        await env.DB.prepare(
          "INSERT OR IGNORE INTO users (id, first_name, username) VALUES (?, ?, ?)"
        ).bind(userId, firstName, username).run();

        // 2. التحقق من الأوامر
        const ADMIN_ID = 5313071841; // الـ ID مالتك

        if (text === '/start') {
          await sendMessage(env.BOT_TOKEN, chatId, `أهلاً بك ${firstName}! 👋\nأنا بوت تجاري، وأنا هنا لخدمتك.`);
        
        } else if (text === '/users') {
          // هذا الأمر خاص بالأدمن فقط
          if (userId !== ADMIN_ID) {
            await sendMessage(env.BOT_TOKEN, chatId, "❌ عذراً، هذا الأمر خاص بمدير البوت فقط.");
            return new Response('OK', { status: 200 });
          }

          // جلب آخر 50 مستخدم من قاعدة البيانات
          const { results } = await env.DB.prepare(
            "SELECT * FROM users ORDER BY joined_at DESC LIMIT 50"
          ).all();

          if (results.length === 0) {
            await sendMessage(env.BOT_TOKEN, chatId, "📭 لا يوجد مستخدمين مسجلين حالياً.");
          } else {
            let messageText = `👥 *قائمة المستخدمين* (آخر ${results.length}):\n\n`;
            results.forEach((user, index) => {
              const userUsername = user.username ? `@${user.username}` : 'لا يوجد';
              messageText += `${index + 1}. الاسم: ${user.first_name}\n   الآيدي: \`${user.id}\`\n   اليوزر: ${userUsername}\n\n`;
            });
            // تيليجرام يحدد طول الرسالة، لذا نرسل الأولى فقط إذا كانت طويلة جداً (سنعالجها لاحقاً)
            await sendMessage(env.BOT_TOKEN, chatId, messageText);
          }
        
        } else {
          // الرد الافتراضي على أي رسالة أخرى
          await sendMessage(env.BOT_TOKEN, chatId, `أهلاً! أنت قلت: ${text}`);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }

    return new Response('OK', { status: 200 });
  }
};

// دالة مساعدة لإرسال الرسائل عبر تيليجرام
async function sendMessage(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown' // لتنسيق النص (مثل الكود)
    })
  });
} 
