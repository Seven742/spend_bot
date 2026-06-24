// utils/parser.js
//
// Parses free-text Telegram messages (Khmer, English, or mixed) into a
// structured transaction object. Handles messages like:
//   "ថ្ងៃនេះបង់ 20000 រៀល សម្រាប់អាហារថ្ងៃត្រង់"   (Today paid 20000 riel for lunch)
//   "ចំណាយ 5 ដុល្លារ លើកាហ្វេ"                      (Spent 5 USD on coffee)
//   "ចំណូល 100000 រៀល"                              (Income 100000 riel)
//   "បៀវត្សរ៍ 300 ដុល្លារ"                            (Salary 300 USD)
// ...as well as the original English phrasing ("Spent 5 USD on coffee", etc).
//
// Detected categories are returned already in Khmer, since the rest of the
// bot (reports, charts, summaries) displays everything in Khmer.

// Words/phrases that flag a message as INCOME rather than an expense
const INCOME_KEYWORDS = [
  // English
  'income', 'salary', 'earned', 'earn', 'received', 'receive',
  'got paid', 'bonus', 'profit', 'revenue', 'wage', 'wages',
  // Khmer
  'ចំណូល', 'បៀវត្សរ៍', 'ប្រាក់ខែ', 'ទទួលបាន', 'រង្វាន់', 'ចំណេញ'
];

// Expense category keyword map. Categories are stored/displayed in Khmer.
// First match wins, so more specific keywords are listed first.
const CATEGORY_MAP = [
  { category: 'កាហ្វេ', keywords: ['coffee', 'cafe', 'tea', 'កាហ្វេ', 'តែ'] },
  { category: 'ម្ហូបអាហារ', keywords: ['lunch', 'dinner', 'breakfast', 'food', 'meal', 'eat', 'restaurant', 'snack', 'អាហារ', 'បាយ', 'ម្ហូប'] },
  { category: 'ការដឹកជញ្ជូន', keywords: ['fuel', 'gas', 'petrol', 'taxi', 'tuktuk', 'tuk-tuk', 'grab', 'transport', 'bus', 'moto', 'ប្រេង', 'តាក់ស៊ី', 'ម៉ូតូ', 'ឡាន'] },
  { category: 'ការទិញឥវ៉ាន់', keywords: ['shopping', 'clothes', 'clothing', 'shoes', 'bag', 'ទិញឥវ៉ាន់', 'សម្លៀកបំពាក់'] },
  { category: 'វិក្កយបត្រ', keywords: ['bill', 'electricity', 'internet', 'wifi', 'utility', 'វិក្កយបត្រ', 'អគ្គិសនី', 'អ៊ីនធឺណិត'] },
  { category: 'ការជួលផ្ទះ', keywords: ['rent', 'apartment', 'ជួលផ្ទះ'] },
  { category: 'សុខភាព', keywords: ['medicine', 'doctor', 'hospital', 'health', 'pharmacy', 'clinic', 'ឱសថ', 'ពេទ្យ', 'មន្ទីរពេទ្យ', 'សុខភាព'] },
  { category: 'កម្សាន្ត', keywords: ['movie', 'entertainment', 'game', 'cinema', 'party', 'កម្សាន្ត', 'កុន'] },
  { category: 'ការសិក្សា', keywords: ['book', 'course', 'tuition', 'school', 'study', 'សិក្សា', 'សាលា', 'សៀវភៅ'] }
];

const DEFAULT_EXPENSE_CATEGORY = 'ផ្សេងៗ';

/**
 * Detects whether the message refers to USD or KHR (Riel).
 * Defaults to KHR since SpendBot primarily targets Cambodian users.
 */
function detectCurrency(text) {
  const lower = text.toLowerCase();
  if (lower.includes('usd') || lower.includes('dollar') || lower.includes('$') || text.includes('ដុល្លារ')) return 'USD';
  if (lower.includes('riel') || lower.includes('khr') || text.includes('រៀល') || text.includes('៛')) return 'KHR';
  return 'KHR';
}

/**
 * Extracts the first numeric value found in the message.
 * Supports plain integers, decimals, and comma-separated thousands (e.g. 20,000).
 */
function detectAmount(text) {
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const cleaned = match[1].replace(/,/g, '');
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}

/**
 * Determines if the message is an income or an expense.
 * Defaults to "expense" since most natural messages describe spending.
 */
function detectType(text) {
  const lower = text.toLowerCase();
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw.toLowerCase()) || text.includes(kw)) return 'income';
  }
  return 'expense';
}

/**
 * Determines the spending/income category (returned in Khmer) based on
 * keyword matching across both English and Khmer phrasing.
 */
function detectCategory(text, type) {
  const lower = text.toLowerCase();

  if (type === 'income') {
    if (lower.includes('salary') || lower.includes('wage') || text.includes('បៀវត្សរ៍') || text.includes('ប្រាក់ខែ')) return 'បៀវត្សរ៍';
    if (lower.includes('bonus') || text.includes('រង្វាន់')) return 'រង្វាន់';
    return 'ចំណូលផ្សេងៗ';
  }

  for (const entry of CATEGORY_MAP) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw.toLowerCase()) || text.includes(kw)) return entry.category;
    }
  }
  return DEFAULT_EXPENSE_CATEGORY;
}

/**
 * Pulls a short description out of the message. Tries English patterns
 * ("for"/"on") first, then Khmer patterns ("សម្រាប់"/"លើ"), and falls back
 * to the detected category if nothing matches.
 */
function detectDescription(text, category) {
  const forMatch = text.match(/\bfor\s+([a-zA-Z\s]+)/i);
  if (forMatch) return forMatch[1].trim();

  const onMatch = text.match(/\bon\s+([a-zA-Z\s]+)/i);
  if (onMatch) return onMatch[1].trim();

  // Khmer "សម្រាប់" (for) / "លើ" (on), followed by Khmer text
  const khmerMatch = text.match(/(?:សម្រាប់|លើ)\s*([\u1780-\u17FF\s]+)/);
  if (khmerMatch) return khmerMatch[1].trim();

  return category;
}

/**
 * Main entry point: parses a raw text message into a transaction object.
 * Returns null if no amount could be detected, meaning the message is
 * probably not a transaction at all (e.g. small talk).
 *
 * @param {string} text - raw message text from the user
 * @returns {{amount:number, currency:string, type:string, category:string, description:string}|null}
 */
function parseMessage(text) {
  const amount = detectAmount(text);
  if (amount === null || amount <= 0) return null;

  const currency = detectCurrency(text);
  const type = detectType(text);
  const category = detectCategory(text, type);
  const description = detectDescription(text, category);

  return { amount, currency, type, category, description };
}

module.exports = { parseMessage };
