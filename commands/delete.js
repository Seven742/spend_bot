// commands/delete.js
// Deletes a transaction by its MongoDB ID.
//   /delete            -> lists the user's 10 most recent transactions with IDs
//   /delete <id>       -> deletes the transaction with that ID (if owned by the user)
//   🗑️ លុបប្រតិបត្តិការ (button) -> same as /delete with no ID

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { BUTTONS } = require('../utils/keyboard');

module.exports = (bot) => {
  bot.command('delete', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) return listRecentTransactions(ctx);
    return deleteById(ctx, args[0]);
  });

  bot.hears(BUTTONS.DELETE, listRecentTransactions);
};

/** Shows the 10 most recent transactions with their IDs so the user can pick one to delete. */
async function listRecentTransactions(ctx) {
  try {
    const txs = await Transaction.find({ userId: ctx.from.id })
      .sort({ createdAt: -1 })
      .limit(10);

    if (txs.length === 0) {
      return ctx.reply('📭 អ្នកមិនទាន់មានប្រតិបត្តិការសម្រាប់លុបទេ។');
    }

    const lines = txs.map((tx) => {
      const sign = tx.type === 'income' ? '+' : '-';
      const unit = tx.currency === 'USD' ? '' : ' រៀល';
      const amountDisplay = tx.currency === 'USD' ? `$${tx.amount.toLocaleString()}` : `${tx.amount.toLocaleString()}${unit}`;
      return `🆔 \`${tx._id}\`\n${sign}${amountDisplay} — ${tx.category}`;
    });

    await ctx.replyWithMarkdown(
      `🗑️ *ប្រតិបត្តិការថ្មីៗរបស់អ្នក៖*\n\n${lines.join('\n\n')}\n\nដើម្បីលុប សូមផ្ញើ៖\n/delete <id>`
    );
  } catch (err) {
    console.error('Error listing transactions for /delete:', err.message);
    await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការទាញប្រតិបត្តិការ។');
  }
}

/** Deletes a single transaction by ID, only if it belongs to the requesting user. */
async function deleteById(ctx, id) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ctx.reply('⚠️ លេខសម្គាល់ (ID) មិនត្រឹមត្រូវទេ។');
    }

    const tx = await Transaction.findOneAndDelete({ _id: id, userId: ctx.from.id });
    if (!tx) {
      return ctx.reply('⚠️ រកមិនឃើញប្រតិបត្តិការនេះទេ ឬមិនមែនជារបស់អ្នកទេ។');
    }

    const unit = tx.currency === 'USD' ? '' : ' រៀល';
    const amountDisplay = tx.currency === 'USD' ? `$${tx.amount.toLocaleString()}` : `${tx.amount.toLocaleString()}${unit}`;
    await ctx.reply(`✅ បានលុបជោគជ័យ៖ ${amountDisplay} (${tx.category})`);
  } catch (err) {
    console.error('Error deleting transaction:', err.message);
    await ctx.reply('⚠️ មានបញ្ហាបច្ចេកទេសក្នុងការលុបប្រតិបត្តិការ។');
  }
}
