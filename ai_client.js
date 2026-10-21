const OpenAI = require('openai');

const SYSTEM_PROMPT = `تو یک دستیار کمک کننده هستی. با استفاده از داده‌هایی که بهت داده شده به پرسش کاربر جواب بده. اگر پاسخ در داده‌ها نبود صادقانه اعلام کن و چیزی نساز. زبان پیش‌فرض پاسخ فارسی باشد مگر کاربر زبان دیگری بخواهد. خوش‌برخورد و کوتاه پاسخ بده.`;

async function generateReply(userMessage, data) {
  const client = new OpenAI({ apiKey: process.env.AI_API_KEY, baseURL: process.env.AI_BASE_URL || undefined });
  const response = await client.chat.completions.create({
    model: process.env.AI_MODEL,
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nتاریخ امروز: ${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeZone: 'Asia/Tehran' }).format(new Date())}` },
      { role: 'user', content: `User message:\n${userMessage}\n\nApplication data (JSON):\n${JSON.stringify(data, null, 2)}` }
    ]
  });
  return response.choices[0]?.message?.content?.trim() || 'پاسخی دریافت نشد.';
}

module.exports = { generateReply };
