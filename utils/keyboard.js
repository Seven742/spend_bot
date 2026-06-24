// utils/keyboard.js
// Defines the Khmer-language button labels and the persistent reply
// keyboard shown to users, so they can tap instead of typing slash commands.

const { Markup } = require('telegraf');

const BUTTONS = {
  TODAY: '📅 ថ្ងៃនេះ',
  WEEK: '📆 សប្តាហ៍នេះ',
  MONTH: '🗓️ ខែនេះ',
  SUMMARY: '📊 សង្ខេបទាំងអស់',
  CATEGORIES: '📂 ប្រភេទចំណាយ',
  BUDGET: '🎯 ថវិកា',
  REPORT: '📈 របាយការណ៍',
  DELETE: '🗑️ លុបប្រតិបត្តិការ',
  HELP: 'ℹ️ ជំនួយ'
};

// Persistent keyboard shown under the chat box (resize_keyboard makes it compact)
const mainKeyboard = Markup.keyboard([
  [BUTTONS.TODAY, BUTTONS.WEEK],
  [BUTTONS.MONTH, BUTTONS.SUMMARY],
  [BUTTONS.CATEGORIES, BUTTONS.BUDGET],
  [BUTTONS.REPORT, BUTTONS.DELETE],
  [BUTTONS.HELP]
]).resize();

module.exports = { BUTTONS, mainKeyboard };
