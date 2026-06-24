// config/db.js
// Handles the MongoDB connection using Mongoose.

const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the URI provided in the .env file.
 * Exits the process if the connection fails, since the bot cannot
 * function without a working database connection.
 */
const connectDB = async () => {
  try {
    // dbName is set explicitly so the bot always uses "SpendBot_DB" even if
    // the connection string in .env doesn't include a database path
    // (e.g. a MongoDB Atlas URI copied straight from the dashboard).
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'SpendBot_DB'
    });
    console.log(`✅ MongoDB connected -> database: "${mongoose.connection.name}"`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
