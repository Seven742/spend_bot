// commands/today.js
// Shows today's expenses and income for the requesting user.

const Transaction = require('../models/Transaction');
const { getTodayRange } = require('../utils/dateRange');
const { summarize, formatTotalsBlock } = require('../utils/summarize');
const { BUTTONS } = require('../utils/keyboard');

module.exports = (bot) => {
  bot.command('today', handler);
  bot.hears(BUTTONS.TODAY, handler);

  async function handler(ctx) {
    try {
      const { start, end } = getTodayRange();

      const txs = await Transaction.find({
        userId: ctx.from.id,
        createdAt: { $gte: start, $lte: end }
      }).sort({ createdAt: 1 });

      if (txs.length === 0) {
        return ctx.reply('📅 មិនទាន់មានប្រតិបត្តិការសម្រាប់ថ្ងៃនេះទេ។');
      }

      const totals = summarize(txs);

      const message =
        `📅 *សង្ខេបថ្ងៃនេះ*\n\n` +
        `${formatTotalsBlock(totals.income, '💰 ចំណូល')}\n\n` +
        `${formatTotalsBlock(totals.expense, '💸 ចំណាយ')}\n\n` +
        `ចំនួនប្រតិបត្តិការ៖ ${txs.length}`;

      await ctx.replyWithMarkdown(message);
    } catch (err) {
      console.error('Error in /today:', err.message);
      await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការទាញទិន្នន័យថ្ងៃនេះ។');
    }
  }
};
