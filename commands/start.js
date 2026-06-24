// commands/start.js
// Welcome message, help menu, and the persistent Khmer keyboard.

const { BUTTONS, mainKeyboard } = require('../utils/keyboard');

module.exports = (bot) => {
  bot.command('start', handler);
  bot.hears(BUTTONS.HELP, handler);

  async function handler(ctx) {
    const name = ctx.from.first_name || ctx.from.username || 'អ្នក';

    const message = `👋 សួស្តី ${name}! សូមស្វាគមន៍មកកាន់ *SpendBot* — កម្មវិធីគ្រប់គ្រងចំណូល-ចំណាយរបស់អ្នក។

💬 *សូមវាយសារដោយផ្ទាល់ ឧទាហរណ៍៖*
• ថ្ងៃនេះបង់ 20000 រៀល សម្រាប់អាហារថ្ងៃត្រង់
• ចំណាយ 5 ដុល្លារ លើកាហ្វេ
• ចំណូល 100000 រៀល
• បៀវត្សរ៍ 300 ដុល្លារ

👇 ឬចុចប៊ូតុងខាងក្រោម ងាយស្រួលប្រើ មិនបាច់វាយ command៖

📅 ថ្ងៃនេះ — ចំណូល/ចំណាយថ្ងៃនេះ
📆 សប្តាហ៍នេះ — សង្ខេប ៧ ថ្ងៃចុងក្រោយ
🗓️ ខែនេះ — សង្ខេបខែនេះ
📊 សង្ខេបទាំងអស់ — ចំណូល/ចំណាយ/សមតុល្យ
📂 ប្រភេទចំណាយ — ចំណាយតាមប្រភេទ
🎯 ថវិកា — កំណត់ ឬមើលថវិកាប្រចាំខែ
📈 របាយការណ៍ — របាយការណ៍ខែនេះ (មានរូបភាពក្រាប)
🗑️ លុបប្រតិបត្តិការ — លុបធាតុមួយ

តោះ ចាប់ផ្តើមកត់ត្រាចំណាយ! 💰`;

    await ctx.replyWithMarkdown(message, mainKeyboard);
  }
};
