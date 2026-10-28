const OpenAI = require('openai');
const { parseAssistantOutput, MAX_MEMORY_CHARACTERS } = require('./assistant_output');

const SYSTEM_PROMPT = `
تو دستیار هوشمند مفید نیوز هستی و فقط دربارهٔ تکالیف، آزمون‌ها و رویدادهای مدرسه کمک می‌کنی.

اگر پیام کاربر صرفاً سلام یا شروع گفتگو بود، خودت را به‌عنوان «دستیار هوشمند مفید نیوز» معرفی کن و بگو می‌توانی در اطلاع از تکالیف و آزمون‌های امروز یا فردا و نیز برنامه‌ریزی برای انجام تکالیف کمک کنی.

تکالیف یا اطلاعات مدرسه را فقط در پاسخ به درخواست کاربر بیان کن؛ خودت بی‌مقدمه آن‌ها را مطرح نکن.

پاسخ‌ها را بر اساس اطلاعاتی که در اختیارت قرار گرفته‌اند بنویس. اگر اطلاعات کافی نداری، صادقانه بگو که نمی‌دانی و چیزی نساز.

اگر کاربر دربارهٔ موضوعی خارج از تکالیف، آزمون‌ها یا رویدادهای مدرسه پرسید، بگو که در این زمینه اطلاعی نداری.

برای تأکید، می‌توانی از *بلد* و _ایتالیک_ استفاده کنی. از **بلد** و __ایتالیک__ استفاده نکن.
`;


async function generateReply(userMessage, data, previousMemory = '', longMemory = {}) {
  const client = new OpenAI({ apiKey: process.env.AI_API_KEY, baseURL: process.env.AI_BASE_URL || undefined });
  const response = await client.chat.completions.create({
    model: process.env.AI_MODEL,
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nتاریخ امروز: ${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeZone: 'Asia/Tehran' }).format(new Date())}` },
      {
        role: 'system',
        content: 'Return exactly one JSON object with properties "reply", "memory", and "long_memory_updates". reply is the user-facing Persian answer. memory is the complete replacement short-term summary, not a patch. Keep it within 1200 Unicode characters and only retain the current/recent discussion needed for the next few messages. Prefer newer details over conflicting older details and drop unrelated topics.\n\nlong_memory_updates must be an object with "set", "add", and "clear": set contains changed scalar values; add contains new items for list fields; clear contains field names to remove. Allowed fields: name, grade, selected_course, schedule_notes, planning_preferences, important_notes. Only propose long-term changes when the user explicitly states, confirms, corrects, or asks to forget that information. Never infer facts from context, application data, or short-term memory. Do not store sensitive information, credentials, or temporary one-off plans as lasting facts. Use empty set/add/clear when there are no changes. Prefer explicit new corrections over older values. Return no markdown fences or extra text.'
      },
      {
        role: 'user',
        content: `Previous short-term memory (may be empty):\n${previousMemory || '(empty)'}\n\nExisting long-term memory (structured facts; update only from explicit user statements):\n${JSON.stringify(longMemory, null, 2)}\n\nCurrent user message:\n${userMessage}\n\nApplication data (JSON):\n${JSON.stringify(data, null, 2)}`
      }
    ]
  });
  return parseAssistantOutput(response.choices[0]?.message?.content);
}

module.exports = { generateReply, parseAssistantOutput, MAX_MEMORY_CHARACTERS };
