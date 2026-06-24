// utils/dateRange.js
//
// Helper functions for computing date range boundaries.
// Cambodia uses ICT (UTC+7) with no daylight saving time, so "today" and
// "this month" are computed relative to that offset rather than the
// server's local time (which may run in UTC on most hosting platforms).

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

/**
 * Returns the start/end Date objects (in real UTC) covering "today"
 * from midnight to 23:59:59.999 in Cambodia time.
 */
function getTodayRange() {
  const shifted = new Date(Date.now() + TZ_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();

  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - TZ_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - TZ_OFFSET_MS);
  return { start, end };
}

/**
 * Returns the start/end Date objects covering the last 7 days (rolling window).
 */
function getWeekRange() {
  const end = new Date();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Returns the start/end Date objects covering the current calendar month
 * in Cambodia time.
 */
function getMonthRange() {
  const shifted = new Date(Date.now() + TZ_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();

  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - TZ_OFFSET_MS);
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999) - TZ_OFFSET_MS);
  return { start, end };
}

module.exports = { getTodayRange, getWeekRange, getMonthRange };
