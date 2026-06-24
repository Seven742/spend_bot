// commands/summary.js
// Shows all-time total income, total expense, and balance.

const Transaction = require('../models/Transaction');
const { summarize, formatTotalsBlock } = require('../utils/summarize');
const { BUTTONS } = require('../utils/keyboard');

module.exports = (bot) => {
  bot.command('summary', handler);
  bot.hears(BUTTONS.SUMMARY, handler);

  async function handler(ctx) {
    try {
      const txs = await Transaction.find({ userId: ctx.from.id });

      if (txs.length === 0) {
        return ctx.reply('📊 មិនទាន់មានប្រតិបត្តិការទេ។');
      }

      const totals = summarize(txs);
      const balanceUSD = totals.income.USD - totals.expense.USD;
      const balanceKHR = totals.income.KHR - totals.expense.KHR;

      const balanceLines = [];
      if (totals.income.USD || totals.expense.USD) balanceLines.push(`  $${balanceUSD.toLocaleString()}`);
      if (totals.income.KHR || totals.expense.KHR) balanceLines.push(`  ${balanceKHR.toLocaleString()} រៀល`);

      const message =
        `📊 *សង្ខេបទាំងអស់*\n\n` +
        `${formatTotalsBlock(totals.income, '💰 ចំណូលសរុប')}\n\n` +
        `${formatTotalsBlock(totals.expense, '💸 ចំណាយសរុប')}\n\n` +
        `⚖️ *សមតុល្យ៖*\n${balanceLines.join('\n')}`;

      await ctx.replyWithMarkdown(message);
    } catch (err) {
      console.error('Error in /summary:', err.message);
      await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការទាញសង្ខេបរបស់អ្នក។');
    }
  }
};
