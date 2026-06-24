// commands/report.js
// Generates a full monthly report: total income, total expense,
// top spending category, full category breakdown, budget status,
// plus a spreadsheet-style report photo (transaction table + category
// summary table with a Grand Total row).

const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { getMonthRange } = require('../utils/dateRange');
const { summarize, formatTotalsBlock } = require('../utils/summarize');
const { BUTTONS } = require('../utils/keyboard');
const { buildReportSVG, renderTableImage } = require('../utils/tableImage');

const MAX_TABLE_ROWS = 20;

module.exports = (bot) => {
  bot.command('report', handler);
  bot.hears(BUTTONS.REPORT, handler);

  async function handler(ctx) {
    try {
      const { start, end } = getMonthRange();

      const txs = await Transaction.find({
        userId: ctx.from.id,
        createdAt: { $gte: start, $lte: end }
      }).sort({ createdAt: 1 });

      if (txs.length === 0) {
        return ctx.reply('📈 មិនទាន់មានទិន្នន័យសម្រាប់បង្កើតរបាយការណ៍ខែនេះទេ។');
      }

      const totals = summarize(txs);

      // Category breakdown (expenses only)
      const categoryMap = {};
      for (const tx of txs) {
        if (tx.type !== 'expense') continue;
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
      }
      const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
      const topCategory = sortedCategories[0];
      const categoryLines = sortedCategories.map(([cat, amt]) => `  • ${cat}: ${amt.toLocaleString()}`);

      // Budget status
      let budgetStatus = 'មិនទាន់មានការកំណត់ថវិកាទេ';
      const budget = await Budget.findOne({ userId: ctx.from.id });
      if (budget) {
        const spent = totals.expense[budget.currency] || 0;
        const pct = budget.amount > 0 ? ((spent / budget.amount) * 100).toFixed(1) : 0;
        const unit = budget.currency === 'USD' ? 'ដុល្លារ' : 'រៀល';
        const status = pct >= 100 ? '🚨 លើសកំណត់' : pct >= 80 ? '⚠️ ជិតដល់កំណត់' : '✅ ធម្មតា';
        budgetStatus = `${spent.toLocaleString()} / ${budget.amount.toLocaleString()} ${unit} (${pct}%) — ${status}`;
      }

      const monthName = new Date().toLocaleString('km-KH', { month: 'long', year: 'numeric' });

      const message =
        `📈 *របាយការណ៍ប្រចាំខែ — ${monthName}*\n\n` +
        `${formatTotalsBlock(totals.income, '💰 ចំណូលសរុប')}\n\n` +
        `${formatTotalsBlock(totals.expense, '💸 ចំណាយសរុប')}\n\n` +
        `🏆 ប្រភេទចំណាយច្រើនបំផុត៖ ${topCategory ? `${topCategory[0]} (${topCategory[1].toLocaleString()})` : 'គ្មាន'}\n\n` +
        `*ការបែងចែកតាមប្រភេទ៖*\n${categoryLines.length ? categoryLines.join('\n') : '  គ្មាន'}\n\n` +
        `🎯 *ស្ថានភាពថវិកា៖* ${budgetStatus}`;

      await ctx.replyWithMarkdown(message);

      // --- Build & send the spreadsheet-style report photo ---
      try {
        const imageBuffer = await buildReportImage(ctx, txs, monthName);
        await ctx.replyWithPhoto({ source: imageBuffer }, { caption: '📈 របាយការណ៍ជារូបភាព' });
      } catch (imgErr) {
        console.error('Report image generation failed:', imgErr.message);
        // The text report was already sent, so we don't block on the image failing
      }
    } catch (err) {
      console.error('Error in /report:', err.message);
      await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការបង្កើតរបាយការណ៍។');
    }
  }
};

/** Formats a single amount for display in a table cell, e.g. "-20,000 រៀល" or "+$5". */
function formatCellAmount(tx) {
  const sign = tx.type === 'income' ? '+' : '-';
  return tx.currency === 'USD'
    ? `${sign}$${tx.amount.toLocaleString()}`
    : `${sign}${tx.amount.toLocaleString()} រៀល`;
}

/**
 * Builds the spreadsheet-style PNG report image for this month's transactions.
 */
async function buildReportImage(ctx, txs, monthName) {
  // Show the most recent MAX_TABLE_ROWS transactions, oldest-first for readability
  const shown = txs.length > MAX_TABLE_ROWS ? txs.slice(-MAX_TABLE_ROWS) : txs;
  const hiddenCount = txs.length - shown.length;

  const rows = shown.map((tx) => ({
    date: tx.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
    description: tx.description || tx.category,
    category: tx.category,
    type: tx.type === 'income' ? 'ចំណូល' : 'ចំណាយ',
    amount: formatCellAmount(tx)
  }));

  // Category summary table uses whichever currency has the larger expense total this month
  const expenseTotals = { USD: 0, KHR: 0 };
  const byCurrency = { USD: {}, KHR: {} };
  for (const tx of txs) {
    if (tx.type !== 'expense') continue;
    byCurrency[tx.currency][tx.category] = (byCurrency[tx.currency][tx.category] || 0) + tx.amount;
    expenseTotals[tx.currency] += tx.amount;
  }
  const primaryCurrency = expenseTotals.KHR >= expenseTotals.USD ? 'KHR' : 'USD';
  const unit = primaryCurrency === 'USD' ? '' : ' រៀល';
  const prefix = primaryCurrency === 'USD' ? '$' : '';

  const categoryTotals = Object.entries(byCurrency[primaryCurrency])
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({ category, total: `${prefix}${total.toLocaleString()}${unit}` }));

  const grandTotal = `${prefix}${expenseTotals[primaryCurrency].toLocaleString()}${unit}`;

  const otherCurrency = primaryCurrency === 'USD' ? 'KHR' : 'USD';
  const otherTotal = expenseTotals[otherCurrency];
  const notes = [];
  if (hiddenCount > 0) notes.push(`មិនបានបង្ហាញប្រតិបត្តិការចំនួន ${hiddenCount} ទៀតក្នុងតារាងនេះ`);
  if (otherTotal > 0) {
    const otherUnit = otherCurrency === 'USD' ? '$' : '';
    const otherSuffix = otherCurrency === 'USD' ? '' : ' រៀល';
    notes.push(`មានចំណាយ ${otherUnit}${otherTotal.toLocaleString()}${otherSuffix} ជា${otherCurrency === 'USD' ? 'ដុល្លារ' : 'រៀល'} ដែលមិនបានបញ្ចូលក្នុងតារាងសរុបនេះ`);
  }

  const svg = buildReportSVG({
    title: 'SpendBot — របាយការណ៍ប្រចាំខែ',
    subtitle: `${monthName}  •  ${ctx.from.username ? '@' + ctx.from.username : (ctx.from.first_name || '')}`,
    rows,
    categoryTotals,
    grandTotal,
    note: notes.length ? notes.join(' / ') : null
  });

  return renderTableImage(svg);
}
