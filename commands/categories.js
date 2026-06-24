// commands/categories.js
// Shows total spending grouped by category, plus a pie chart image.

const Transaction = require('../models/Transaction');
const { BUTTONS } = require('../utils/keyboard');
const { renderChart, buildCategoryPieConfig } = require('../utils/chart');

module.exports = (bot) => {
  bot.command('categories', handler);
  bot.hears(BUTTONS.CATEGORIES, handler);

  async function handler(ctx) {
    try {
      const txs = await Transaction.find({ userId: ctx.from.id, type: 'expense' });

      if (txs.length === 0) {
        return ctx.reply('📂 មិនទាន់មានចំណាយទេ។');
      }

      const categoryMap = {}; // { category: { USD: total, KHR: total } }
      for (const tx of txs) {
        if (!categoryMap[tx.category]) categoryMap[tx.category] = { USD: 0, KHR: 0 };
        categoryMap[tx.category][tx.currency] += tx.amount;
      }

      const lines = Object.entries(categoryMap)
        .sort((a, b) => (b[1].USD + b[1].KHR) - (a[1].USD + a[1].KHR))
        .map(([cat, amounts]) => {
          const parts = [];
          if (amounts.USD) parts.push(`$${amounts.USD.toLocaleString()}`);
          if (amounts.KHR) parts.push(`${amounts.KHR.toLocaleString()} រៀល`);
          return `• *${cat}*: ${parts.join(' + ')}`;
        });

      await ctx.replyWithMarkdown(`📂 *ចំណាយតាមប្រភេទ*\n\n${lines.join('\n')}`);

      // --- Send a pie chart photo (uses KHR amounts, the most common case) ---
      try {
        const pieData = {};
        for (const [cat, amounts] of Object.entries(categoryMap)) {
          const value = amounts.KHR || amounts.USD;
          if (value) pieData[cat] = value;
        }
        const config = buildCategoryPieConfig(pieData, 'ចំណាយតាមប្រភេទ');
        const imageBuffer = await renderChart(config);
        await ctx.replyWithPhoto({ source: imageBuffer }, { caption: '📂 ក្រាបបង្ហាញចំណាយតាមប្រភេទ' });
      } catch (chartErr) {
        console.error('Chart generation failed for /categories:', chartErr.message);
        // Text summary was already sent above, so we don't block on the chart failing
      }
    } catch (err) {
      console.error('Error in /categories:', err.message);
      await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការទាញប្រភេទចំណាយ។');
    }
  }
};
