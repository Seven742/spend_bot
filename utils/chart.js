// utils/chart.js
// Renders chart images for reports using the QuickChart.io API. This avoids
// requiring native canvas build tools (which are often unavailable or
// painful to install on simple hosting like Render.com), so the bot stays
// easy to deploy. Requires internet access and Node 18+ (built-in fetch).

const QUICKCHART_URL = 'https://quickchart.io/chart';

/**
 * Sends a chart config to QuickChart and returns the rendered PNG as a Buffer.
 * @param {object} chartConfig - a Chart.js compatible config object
 */
async function renderChart(chartConfig, { width = 600, height = 400 } = {}) {
  const response = await fetch(QUICKCHART_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart: chartConfig,
      width,
      height,
      backgroundColor: 'white',
      format: 'png'
    })
  });

  if (!response.ok) {
    throw new Error(`QuickChart request failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Builds a pie chart config from a { categoryLabel: amount } map.
 */
function buildCategoryPieConfig(categoryMap, title) {
  const labels = Object.keys(categoryMap);
  const data = Object.values(categoryMap);
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8BC34A', '#E91E63'];

  return {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, labels.length) }]
    },
    options: {
      plugins: {
        title: { display: true, text: title, font: { size: 18 } },
        legend: { position: 'right' }
      }
    }
  };
}

/**
 * Builds a simple bar chart config, e.g. for daily spending in /week.
 */
function buildBarChartConfig(labels, data, title, datasetLabel) {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: datasetLabel, data, backgroundColor: '#36A2EB' }]
    },
    options: {
      plugins: {
        title: { display: true, text: title, font: { size: 18 } },
        legend: { display: false }
      },
      scales: { y: { beginAtZero: true } }
    }
  };
}

module.exports = { renderChart, buildCategoryPieConfig, buildBarChartConfig };
