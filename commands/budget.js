// commands/budget.js
// Sets or views the user's monthly budget.
//   /budget 500000        -> sets budget to 500,000 Riel
//   /budget 300 USD       -> sets budget to $300
//   /budget               -> shows current budget status
//   🎯 ថវិកា (button)      -> shows current budget status
//   natural text "ថវិកា 500000" -> also sets the budget (see trySetBudgetFromText)
//
// Also exports checkBudgetThreshold(), called from bot.js right after a
// new expense is saved, to send 80%/100% warnings exactly once when the
// threshold is first crossed.

const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { getMonthRange } = require('../utils/dateRange');
const { BUTTONS } = require('../utils/keyboard');

module.exports = (bot) => {
  bot.command('budget', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length === 0) {
      return showBudgetStatus(ctx);
    }
    return setBudget(ctx, args);
  });

  bot.hears(BUTTONS.BUDGET, showBudgetStatus);
};

/** Shows the user's current budget vs. how much they've spent this month. */
async function showBudgetStatus(ctx) {
  try {
    const budget = await Budget.findOne({ userId: ctx.from.id });
    if (!budget) {
      return ctx.reply(
        'ℹ️ មិនទាន់មានការកំណត់ថវិកាទេ។\nសូមផ្ញើ /budget <ចំនួន> ឧទាហរណ៍៖ /budget 500000\nឬវាយផ្ទាល់៖ "ថវិកា 500000"'
      );
    }

    const { start, end } = getMonthRange();
    const txs = await Transaction.find({
      userId: ctx.from.id,
      type: 'expense',
      currency: budget.currency,
      createdAt: { $gte: start, $lte: end }
    });
    const spent = txs.reduce((sum, tx) => sum + tx.amount, 0);
    const pct = budget.amount > 0 ? ((spent / budget.amount) * 100).toFixed(1) : 0;
    const unit = budget.currency === 'USD' ? 'ដុល្លារ' : 'រៀល';

    await ctx.replyWithMarkdown(
      `🎯 *ថវិកាប្រចាំខែ៖* ${budget.amount.toLocaleString()} ${unit}\n` +
      `💸 បានចំណាយខែនេះ៖ ${spent.toLocaleString()} ${unit} (${pct}%)`
    );
  } catch (err) {
    console.error('Error showing budget status:', err.message);
    await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការទាញព័ត៌មានថវិកា។');
  }
}

/** Sets a new budget from /budget <amount> [USD] command args. */
async function setBudget(ctx, args) {
  try {
    const amount = parseFloat(args[0].replace(/,/g, ''));
    if (Number.isNaN(amount) || amount <= 0) {
      return ctx.reply('⚠️ សូមផ្តល់ចំនួនទឹកប្រាក់ត្រឹមត្រូវ ឧទាហរណ៍៖ /budget 500000');
    }
    const currency = (args[1] && args[1].toUpperCase() === 'USD') ? 'USD' : 'KHR';

    await Budget.findOneAndUpdate(
      { userId: ctx.from.id },
      { userId: ctx.from.id, amount, currency, createdAt: new Date() },
      { upsert: true, new: true }
    );

    const display = currency === 'USD' ? `$${amount.toLocaleString()}` : `${amount.toLocaleString()} រៀល`;
    await ctx.reply(`✅ បានកំណត់ថវិកាប្រចាំខែត្រឹម ${display}`);
  } catch (err) {
    console.error('Error setting budget:', err.message);
    await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការកំណត់ថវិកា។');
  }
}

/**
 * Allows setting the budget via natural language, e.g. "ថវិកា 500000" or
 * "budget 300 USD" typed directly into the chat (not as a slash command).
 * Called from bot.js's text handler before falling back to expense/income
 * parsing. Returns true if it handled the message.
 */
async function trySetBudgetFromText(ctx, text) {
  const lower = text.toLowerCase();
  if (!text.includes('ថវិកា') && !lower.includes('budget')) return false;

  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return false; // mentions budget but no amount -> let other handlers respond

  const amount = parseFloat(match[1].replace(/,/g, ''));
  if (Number.isNaN(amount) || amount <= 0) return false;

  const currency = /usd|dollar|\$/i.test(text) || text.includes('ដុល្លារ') ? 'USD' : 'KHR';

  await Budget.findOneAndUpdate(
    { userId: ctx.from.id },
    { userId: ctx.from.id, amount, currency, createdAt: new Date() },
    { upsert: true, new: true }
  );

  const display = currency === 'USD' ? `$${amount.toLocaleString()}` : `${amount.toLocaleString()} រៀល`;
  await ctx.reply(`✅ បានកំណត់ថវិកាប្រចាំខែត្រឹម ${display}`);
  return true;
}

/**
 * Checks whether the new transaction just pushed the user's monthly
 * spending across the 80% or 100% budget threshold, and sends a warning
 * if so. Fires only once per threshold crossing by comparing spend totals
 * before vs. after this transaction was added.
 */
async function checkBudgetThreshold(ctx, newTx) {
  try {
    const budget = await Budget.findOne({ userId: newTx.userId, currency: newTx.currency });
    if (!budget || budget.amount <= 0) return;

    const { start, end } = getMonthRange();
    const txs = await Transaction.find({
      userId: newTx.userId,
      type: 'expense',
      currency: budget.currency,
      createdAt: { $gte: start, $lte: end }
    });

    const totalSpent = txs.reduce((sum, tx) => sum + tx.amount, 0);
    const prevSpent = totalSpent - newTx.amount;
    const pctBefore = (prevSpent / budget.amount) * 100;
    const pctAfter = (totalSpent / budget.amount) * 100;
    const unit = budget.currency === 'USD' ? 'ដុល្លារ' : 'រៀល';

    if (pctBefore < 100 && pctAfter >= 100) {
      await ctx.replyWithMarkdown(
        `🚨 *អ្នកប្រើលើសថវិកាហើយ!*\nអ្នកបានចំណាយ ${totalSpent.toLocaleString()} ${unit} ក្នុងថវិកាប្រចាំខែ ${budget.amount.toLocaleString()} ${unit} របស់អ្នក។`
      );
    } else if (pctBefore < 80 && pctAfter >= 80) {
      await ctx.replyWithMarkdown(
        `⚠️ *ប្រយ័ត្ន! ជិតដល់ដែនកំណត់ថវិកា*\nអ្នកបានប្រើ ${pctAfter.toFixed(1)}% នៃថវិកាប្រចាំខែ (${totalSpent.toLocaleString()} / ${budget.amount.toLocaleString()} ${unit})។`
      );
    }
  } catch (err) {
    console.error('Error checking budget threshold:', err.message);
  }
}

module.exports.checkBudgetThreshold = checkBudgetThreshold;
module.exports.trySetBudgetFromText = trySetBudgetFromText;
