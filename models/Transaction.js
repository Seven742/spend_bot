// models/Transaction.js
// Represents a single income or expense transaction.
// Stored in the "Spend" collection inside the SpendBot_DB database
// (collection name is explicit per project requirements).

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Telegram numeric user ID — used to scope all queries to a single user
  userId: {
    type: Number,
    required: true,
    index: true
  },
  // Telegram @username (falls back to first name if no username is set)
  username: {
    type: String,
    default: 'unknown'
  },
  // Whether this record adds money (income) or removes it (expense)
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'KHR'],
    required: true
  },
  // e.g. Food, Coffee, Transport, Shopping, Salary, Other...
  category: {
    type: String,
    required: true,
    trim: true
  },
  // Free-text note extracted from the original message (e.g. "lunch")
  description: {
    type: String,
    default: '',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Third argument forces the exact collection name "Spend" instead of
// Mongoose's default pluralized "transactions".
module.exports = mongoose.model('Transaction', transactionSchema, 'Spend');
