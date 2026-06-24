// commands/week.js
// Shows a 7-day summary with a daily breakdown and category breakdown.

const Transaction = require('../models/Transaction');
const { getWeekRange } = require('../utils/dateRange');
const { summarize, formatTotalsBlock } = require('../utils/summarize');
const { BUTTONS } = require('../utils/keyboard');

module.exports = (bot) => {
  bot.command('week', handler);
  bot.hears(BUTTONS.WEEK, handler);

  async function handler(ctx) {
    try {
      const { start, end } = getWeekRange();

      const txs = await Transaction.find({
        userId: ctx.from.id,
        createdAt: { $gte: start, $lte: end }
      }).sort({ createdAt: 1 });

      if (txs.length === 0) {
        return ctx.reply('📆 មិនមានប្រតិបត្តិការក្នុង ៧ ថ្ងៃចុងក្រោយទេ។');
      }

      // --- Daily breakdown, split per currency to avoid mixing USD/KHR ---
      const dailyMap = {}; // { 'YYYY-MM-DD': { USD: {income,expense}, KHR: {income,expense} } }
      for (const tx of txs) {
        const day = tx.createdAt.toISOString().slice(0, 10);
        if (!dailyMap[day]) {
          dailyMap[day] = { USD: { income: 0, expense: 0 }, KHR: { income: 0, expense: 0 } };
        }
        dailyMap[day][tx.currency][tx.type] += tx.amount;
      }

      const dailyLines = Object.keys(dailyMap).sort().map((day) => {
        const d = dailyMap[day];
        const parts = [];
        if (d.USD.income || d.USD.expense) {
          parts.push(`$ -${d.USD.expense.toLocaleString()} / +${d.USD.income.toLocaleString()}`);
        }
        if (d.KHR.income || d.KHR.expense) {
          parts.push(`រៀល -${d.KHR.expense.toLocaleString()} / +${d.KHR.income.toLocaleString()}`);
        }
        return `• ${day}: ${parts.join('  |  ')}`;
      });

      // --- Category breakdown (expenses only) ---
      const categoryMap = {};
      for (const tx of txs) {
        if (tx.type !== 'expense') continue;
        const key = `${tx.category} (${tx.currency})`;
        categoryMap[key] = (categoryMap[key] || 0) + tx.amount;
      }
      const categoryLines = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => `• ${cat}: ${amt.toLocaleString()}`);

      const totals = summarize(txs);

      const message =
        `📆 *សង្ខេប ៧ ថ្ងៃចុងក្រោយ*\n\n` +
        `${formatTotalsBlock(totals.income, '💰 ចំណូល')}\n\n` +
        `${formatTotalsBlock(totals.expense, '💸 ចំណាយ')}\n\n` +
        `*ការបែងចែកប្រចាំថ្ងៃ* (ចំណាយ / ចំណូល):\n${dailyLines.join('\n')}\n\n` +
        `*ការបែងចែកតាមប្រភេទ* (ចំណាយ):\n${categoryLines.length ? categoryLines.join('\n') : 'គ្មាន'}`;

      await ctx.replyWithMarkdown(message);
    } catch (err) {
      console.error('Error in /week:', err.message);
      await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការទាញទិន្នន័យសប្តាហ៍នេះ។');
    }
  }
};
