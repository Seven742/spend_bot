// utils/tableImage.js
//
// Renders a spreadsheet-style report image: a title banner, a row-by-row
// transaction table, and a category summary table ending in a bold
// "Grand Total" row — similar in style to a typical Google Sheets expense
// report. Built as hand-drawn SVG and rasterized to PNG with `sharp`
// (no headless browser or paid screenshot API required).
//
// IMPORTANT: Khmer glyphs need a Khmer-capable font installed on the host
// running this code, e.g.:
//   apt-get install -y fonts-khmeros
// (the same font package family used for the project's earlier Khmer PDF
// generation work). Without it, Khmer text will render as blank boxes.

const sharp = require('sharp');

const COLORS = {
  headerGreen: '#93C47D',
  headerBlue: '#A4B7E1',
  rowAlt: '#F3F3F3',
  rowWhite: '#FFFFFF',
  grandTotal: '#D9D9D9',
  border: '#999999'
};

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, max) {
  const s = String(str);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Builds the report image as an SVG string.
 *
 * @param {object} opts
 * @param {string} opts.title - main title line (e.g. bot/report name)
 * @param {string} opts.subtitle - secondary line (e.g. month + user)
 * @param {Array<{date:string, description:string, category:string, type:string, amount:string}>} opts.rows
 * @param {Array<{category:string, total:string}>} opts.categoryTotals
 * @param {string} opts.grandTotal - formatted grand total string
 * @param {string} [opts.note] - optional small footnote (e.g. truncation notice)
 */
function buildReportSVG({ title, subtitle, rows, categoryTotals, grandTotal, note }) {
  const width = 980;
  const colWidths = [50, 110, 320, 170, 130, 150]; // No, Date, Description, Category, Type, Amount
  const colX = [];
  let cursor = 20;
  for (const w of colWidths) { colX.push(cursor); cursor += w; }
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  const rowHeight = 30;
  const headerHeight = 36;
  const titleHeight = 80;
  const gap = 24;

  const tableTop = titleHeight;
  const tableBodyTop = tableTop + headerHeight;
  const tableHeight = headerHeight + rows.length * rowHeight;

  const summaryTop = tableTop + tableHeight + gap;
  const summaryColWidths = [260, 200];
  const summaryRowHeight = 30;
  const summaryHeaderHeight = 32;
  const summaryHeight = summaryHeaderHeight + (categoryTotals.length + 1) * summaryRowHeight; // +1 for grand total row

  const noteHeight = note ? 26 : 6;
  const totalHeight = summaryTop + summaryHeight + noteHeight + 16;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" font-family="Khmer OS, Noto Sans Khmer, Arial, sans-serif">`;
  svg += `<rect width="100%" height="100%" fill="white"/>`;

  // Title banner
  svg += `<text x="${width / 2}" y="34" font-size="22" font-weight="bold" text-anchor="middle">${escapeXml(title)}</text>`;
  svg += `<text x="${width / 2}" y="60" font-size="16" text-anchor="middle">${escapeXml(subtitle)}</text>`;

  // --- Main transaction table ---
  const headers = ['No', 'កាលបរិច្ឆេទ', 'បរិយាយ', 'ប្រភេទ', 'ប្រភេទប្រតិបត្តិការ', 'ចំនួនទឹកប្រាក់'];
  svg += `<rect x="20" y="${tableTop}" width="${tableWidth}" height="${headerHeight}" fill="${COLORS.headerGreen}" stroke="${COLORS.border}"/>`;
  headers.forEach((h, i) => {
    svg += `<text x="${colX[i] + colWidths[i] / 2}" y="${tableTop + headerHeight / 2 + 5}" font-size="14" font-weight="bold" text-anchor="middle">${escapeXml(h)}</text>`;
  });

  rows.forEach((row, i) => {
    const rowY = tableBodyTop + i * rowHeight;
    const fill = i % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;
    svg += `<rect x="20" y="${rowY}" width="${tableWidth}" height="${rowHeight}" fill="${fill}" stroke="${COLORS.border}"/>`;
    const cells = [String(i + 1), row.date, row.description, row.category, row.type, row.amount];
    cells.forEach((cell, ci) => {
      const anchor = ci === 2 ? 'start' : 'middle';
      const tx = ci === 2 ? colX[ci] + 6 : colX[ci] + colWidths[ci] / 2;
      svg += `<text x="${tx}" y="${rowY + rowHeight / 2 + 5}" font-size="13" text-anchor="${anchor}">${escapeXml(truncate(cell, ci === 2 ? 38 : 16))}</text>`;
    });
  });

  // Vertical grid lines for the main table
  let vx = 20;
  for (const w of colWidths) {
    svg += `<line x1="${vx}" y1="${tableTop}" x2="${vx}" y2="${tableTop + tableHeight}" stroke="${COLORS.border}"/>`;
    vx += w;
  }
  svg += `<line x1="${vx}" y1="${tableTop}" x2="${vx}" y2="${tableTop + tableHeight}" stroke="${COLORS.border}"/>`;

  // --- Category summary table ---
  const sumColX = [20, 20 + summaryColWidths[0]];
  svg += `<rect x="20" y="${summaryTop}" width="${summaryColWidths[0] + summaryColWidths[1]}" height="${summaryHeaderHeight}" fill="${COLORS.headerBlue}" stroke="${COLORS.border}"/>`;
  svg += `<text x="${sumColX[0] + summaryColWidths[0] / 2}" y="${summaryTop + summaryHeaderHeight / 2 + 5}" font-size="14" font-weight="bold" font-style="italic" text-anchor="middle">ប្រភេទ</text>`;
  svg += `<text x="${sumColX[1] + summaryColWidths[1] / 2}" y="${summaryTop + summaryHeaderHeight / 2 + 5}" font-size="14" font-weight="bold" text-anchor="middle">សរុប</text>`;

  categoryTotals.forEach((row, i) => {
    const rowY = summaryTop + summaryHeaderHeight + i * summaryRowHeight;
    svg += `<rect x="20" y="${rowY}" width="${summaryColWidths[0]}" height="${summaryRowHeight}" fill="${COLORS.rowWhite}" stroke="${COLORS.border}"/>`;
    svg += `<rect x="${sumColX[1]}" y="${rowY}" width="${summaryColWidths[1]}" height="${summaryRowHeight}" fill="${COLORS.rowWhite}" stroke="${COLORS.border}"/>`;
    svg += `<text x="${sumColX[0] + summaryColWidths[0] / 2}" y="${rowY + summaryRowHeight / 2 + 5}" font-size="13" text-anchor="middle">${escapeXml(row.category)}</text>`;
    svg += `<text x="${sumColX[1] + summaryColWidths[1] / 2}" y="${rowY + summaryRowHeight / 2 + 5}" font-size="13" text-anchor="middle">${escapeXml(row.total)}</text>`;
  });

  const grandY = summaryTop + summaryHeaderHeight + categoryTotals.length * summaryRowHeight;
  svg += `<rect x="20" y="${grandY}" width="${summaryColWidths[0]}" height="${summaryRowHeight}" fill="${COLORS.grandTotal}" stroke="${COLORS.border}"/>`;
  svg += `<rect x="${sumColX[1]}" y="${grandY}" width="${summaryColWidths[1]}" height="${summaryRowHeight}" fill="${COLORS.grandTotal}" stroke="${COLORS.border}"/>`;
  svg += `<text x="${sumColX[0] + summaryColWidths[0] / 2}" y="${grandY + summaryRowHeight / 2 + 5}" font-size="14" font-weight="bold" text-anchor="middle">សរុបទាំងអស់</text>`;
  svg += `<text x="${sumColX[1] + summaryColWidths[1] / 2}" y="${grandY + summaryRowHeight / 2 + 5}" font-size="14" font-weight="bold" text-anchor="middle">${escapeXml(grandTotal)}</text>`;

  if (note) {
    svg += `<text x="20" y="${grandY + summaryRowHeight + 18}" font-size="12" font-style="italic" fill="#666666">${escapeXml(note)}</text>`;
  }

  svg += `</svg>`;
  return svg;
}

/** Rasterizes an SVG string into a PNG Buffer using sharp. */
async function renderTableImage(svgString) {
  return sharp(Buffer.from(svgString)).png().toBuffer();
}

module.exports = { buildReportSVG, renderTableImage };
