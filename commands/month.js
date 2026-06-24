// commands/month.js
// Shows the current calendar month's summary, including top category
// and budget status if a budget has been set.

const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { getMonthRange } = require('../utils/dateRange');
const { summarize, formatTotalsBlock } = require('../utils/summarize');
const { BUTTONS } = require('../utils/keyboard');

module.exports = (bot) => {
  bot.command('month', handler);
  bot.hears(BUTTONS.MONTH, handler);

  async function handler(ctx) {
    try {
      const { start, end } = getMonthRange();

      const txs = await Transaction.find({
        userId: ctx.from.id,
        createdAt: { $gte: start, $lte: end }
      });

      if (txs.length === 0) {
        return ctx.reply('🗓️ មិនទាន់មានប្រតិបត្តិការសម្រាប់ខែនេះទេ។');
      }

      const totals = summarize(txs);

      // Top spending category this month
      const categoryMap = {};
      for (const tx of txs) {
        if (tx.type !== 'expense') continue;
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
      }
      const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];

      // Budget status (if set)
      let budgetLine = '';
      const budget = await Budget.findOne({ userId: ctx.from.id });
      if (budget) {
        const spent = totals.expense[budget.currency] || 0;
        const pct = budget.amount > 0 ? ((spent / budget.amount) * 100).toFixed(1) : 0;
        budgetLine = `\n\n🎯 *ថវិកា៖* ${budget.amount.toLocaleString()} ${budget.currency === 'USD' ? 'ដុល្លារ' : 'រៀល'} — បានប្រើ ${pct}%`;
      }

      const message =
        `🗓️ *សង្ខេបខែនេះ*\n\n` +
        `${formatTotalsBlock(totals.income, '💰 ចំណូល')}\n\n` +
        `${formatTotalsBlock(totals.expense, '💸 ចំណាយ')}\n\n` +
        `🏆 ប្រភេទចំណាយច្រើនបំផុត៖ ${topCategory ? `${topCategory[0]} (${topCategory[1].toLocaleString()})` : 'គ្មាន'}` +
        budgetLine;

      await ctx.replyWithMarkdown(message);
    } catch (err) {
      console.error('Error in /month:', err.message);
      await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការទាញទិន្នន័យខែនេះ។');
    }
  }
};
