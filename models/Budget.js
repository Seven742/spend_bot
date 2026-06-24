// models/Budget.js
// Represents a user's monthly budget. Each user has exactly one active
// budget document, which is overwritten whenever they run /budget <amount>.

const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'KHR'],
    default: 'KHR'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Budget', budgetSchema);
