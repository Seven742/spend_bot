// utils/summarize.js
//
// Shared helpers for totalling up transactions. Since SpendBot supports
// both USD and KHR, totals are always tracked per-currency rather than
// added together directly.

/**
 * Totals a list of transactions into { income: {USD, KHR}, expense: {USD, KHR} }.
 */
function summarize(transactions) {
  const totals = {
    income: { USD: 0, KHR: 0 },
    expense: { USD: 0, KHR: 0 }
  };

  for (const tx of transactions) {
    totals[tx.type][tx.currency] += tx.amount;
  }

  return totals;
}

/**
 * Formats a { USD, KHR } totals object into a readable multi-line block, e.g.:
 *   "💰 ចំណូល:
 *     $120
 *     50,000 រៀល"
 */
function formatTotalsBlock(currencyTotals, label) {
  const lines = [];
  if (currencyTotals.USD) lines.push(`  $${currencyTotals.USD.toLocaleString('en-US')}`);
  if (currencyTotals.KHR) lines.push(`  ${currencyTotals.KHR.toLocaleString('en-US')} រៀល`);
  if (lines.length === 0) lines.push('  0');
  return `${label}:\n${lines.join('\n')}`;
}

module.exports = { summarize, formatTotalsBlock };
