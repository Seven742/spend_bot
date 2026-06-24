// bot.js
// Sets up the Telegraf bot instance: registers all slash commands, the
// Khmer button shortcuts, and the natural-language message handler that
// parses & saves expenses/income (in Khmer or English).

const { Telegraf } = require('telegraf');
const Transaction = require('./models/Transaction');
const { parseMessage } = require('./utils/parser');
const { trySetBudgetFromText, checkBudgetThreshold } = require('./commands/budget');

// Command modules — each exports a function that registers itself (and any
// Khmer button shortcuts) on the bot
const registerStart = require('./commands/start');
const registerToday = require('./commands/today');
const registerWeek = require('./commands/week');
const registerMonth = require('./commands/month');
const registerSummary = require('./commands/summary');
const registerCategories = require('./commands/categories');
const registerBudget = require('./commands/budget');
const registerReport = require('./commands/report');
const registerDelete = require('./commands/delete');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- Register all slash commands + Khmer button shortcuts ---
registerStart(bot);
registerToday(bot);
registerWeek(bot);
registerMonth(bot);
registerSummary(bot);
registerCategories(bot);
registerBudget(bot);
registerReport(bot);
registerDelete(bot);

// --- Natural language handler ---
// Runs for any plain text message that isn't a slash command or a button
// tap (those are matched by bot.hears() above and won't reach here).
// Parses the message, saves it as a transaction, confirms to the user in
// Khmer, and checks budget thresholds if it was an expense.
bot.on('text', async (ctx) => {
  const text = ctx.message.text;

  // Slash commands are already handled by bot.command() above
  if (text.startsWith('/')) return;

  try {
    // Allow setting a budget via natural text, e.g. "ថវិកា 500000"
    const handledAsBudget = await trySetBudgetFromText(ctx, text);
    if (handledAsBudget) return;

    const parsed = parseMessage(text);

    if (!parsed) {
      return ctx.reply(
        '🤔 ខ្ញុំរកមិនឃើញចំនួនទឹកប្រាក់ក្នុងសារនេះទេ។ សូមសាកល្បងសរសេរបែបនេះ៖\n' +
        '"ចំណាយ 5 ដុល្លារ លើកាហ្វេ" ឬ "ចំណូល 100000 រៀល"'
      );
    }

    const transaction = await Transaction.create({
      userId: ctx.from.id,
      username: ctx.from.username || ctx.from.first_name || 'unknown',
      type: parsed.type,
      amount: parsed.amount,
      currency: parsed.currency,
      category: parsed.category,
      description: parsed.description
    });

    const emoji = parsed.type === 'income' ? '💰' : '💸';
    const typeLabel = parsed.type === 'income' ? 'ចំណូល' : 'ចំណាយ';
    const sign = parsed.type === 'income' ? '+' : '-';
    const amountDisplay = parsed.currency === 'USD'
      ? `$${parsed.amount.toLocaleString()}`
      : `${parsed.amount.toLocaleString()} រៀល`;

    await ctx.reply(
      `${emoji} ${typeLabel}ត្រូវបានកត់ត្រា!\n` +
      `${sign}${amountDisplay} — ${parsed.category}\n` +
      `🆔 ${transaction._id}`
    );

    // Check budget thresholds only after recording an expense
    if (parsed.type === 'expense') {
      await checkBudgetThreshold(ctx, transaction);
    }
  } catch (err) {
    console.error('Error processing message:', err.message);
    await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការរក្សាទុកប្រតិបត្តិការ។ សូមព្យាយាមម្តងទៀត។');
  }
});

// Global error handler so a single failed update doesn't crash the bot
bot.catch((err, ctx) => {
  console.error(`Bot error for update type "${ctx.updateType}":`, err);
});

module.exports = bot;
