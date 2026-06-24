# SpendBot 💰

A Khmer-language Telegram expense & income tracker bot built with **Node.js**, **Express**, **MongoDB**, **Mongoose**, and **Telegraf**.

SpendBot lets people log expenses and income just by typing naturally in **Khmer or English** — no rigid command syntax required — and offers a tap-friendly Khmer keyboard so users never have to type a slash command at all.

## Features

- **Khmer-first interface** — every reply, button, and warning is in Khmer
- **Natural language tracking** in Khmer or English, e.g.:
  - *"ថ្ងៃនេះបង់ 20000 រៀល សម្រាប់អាហារថ្ងៃត្រង់"* (Today I paid 20000 riel for lunch)
  - *"ចំណាយ 5 ដុល្លារ លើកាហ្វេ"* (Spent 5 USD on coffee)
  - *"ចំណូល 100000 រៀល"* (Income 100000 riel)
  - *"បៀវត្សរ៍ 300 ដុល្លារ"* (Salary 300 USD)
- **Persistent Khmer keyboard** — tap 📅 ថ្ងៃនេះ, 📆 សប្តាហ៍នេះ, 🗓️ ខែនេះ, 📊 សង្ខេបទាំងអស់, 📂 ប្រភេទចំណាយ, 🎯 ថវិកា, 📈 របាយការណ៍, 🗑️ លុបប្រតិបត្តិការ, or ℹ️ ជំនួយ instead of typing commands
- Automatic extraction of amount, currency (USD/KHR), category, date, Telegram user ID & username
- `/today`, `/week`, `/month`, `/summary` — spending & income reports
- `/categories` — spending grouped by category **with a pie-chart photo**
- `/budget <amount>` — set a monthly budget (also settable via natural text like "ថវិកា 500000"), with automatic 80% / 100% warnings
- `/report` — full monthly report (totals, top category, category breakdown, budget status) **with a spreadsheet-style report photo** (transaction table + category summary with a Grand Total row, in the style of a Google Sheets expense report)
- `/delete <id>` — delete a transaction by ID

## Folder Structure

```
SpendBot/
├── server.js          # Entry point — connects DB, launches bot, starts Express
├── bot.js              # Telegraf setup, command registration, NLP message handler
├── .env.example        # Example environment variables
├── package.json
├── config/
│   └── db.js           # MongoDB connection
├── models/
│   ├── Transaction.js  # Mongoose schema -> "Spend" collection
│   └── Budget.js       # Mongoose schema -> budget per user
├── commands/
│   ├── start.js         # Welcome + Khmer keyboard
│   ├── today.js
│   ├── week.js
│   ├── month.js
│   ├── summary.js
│   ├── categories.js    # + pie chart photo
│   ├── budget.js        # set/view budget + threshold warnings
│   ├── report.js        # full report + spreadsheet-style table image
│   └── delete.js
└── utils/
    ├── parser.js        # Khmer/English natural language -> transaction parser
    ├── dateRange.js      # Today/week/month date boundaries (Cambodia time, UTC+7)
    ├── summarize.js      # Totalling helpers
    ├── keyboard.js       # Khmer button labels + persistent keyboard
    ├── chart.js          # Pie chart generation for /categories (QuickChart.io)
    └── tableImage.js     # Spreadsheet-style table image for /report (SVG + sharp)
```

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your values:

   ```bash
   cp .env.example .env
   ```

   ```
   BOT_TOKEN=your_telegram_bot_token_here
   MONGO_URI=mongodb://localhost:27017/SpendBot_DB
   PORT=3000
   ```

   Get a `BOT_TOKEN` from [@BotFather](https://t.me/BotFather) on Telegram.

3. **Run the bot**

   ```bash
   npm start
   ```

   Or with auto-reload during development:

   ```bash
   npm run dev
   ```

## Requirements

- **Node.js 18 or newer** is required — the `/categories` pie chart uses Node's built-in `fetch` to call the QuickChart.io image API.
- **A Khmer-capable font installed on the host** for the `/report` table image to display Khmer glyphs correctly (otherwise they render as blank boxes). Install one with:
  ```bash
  apt-get update && apt-get install -y fonts-khmeros
  ```
  This is the same font package used in this project's earlier Khmer PDF generation work. If deploying with Docker, add that line to your Dockerfile.
- **Internet access** for the `/categories` pie chart (calls the public QuickChart.io API). The `/report` table image is generated locally and does not need internet access. If a chart/image fails to generate for any reason, the text report/summary still sends normally — image generation failures never block the text reply.

## Database

- **Database name:** `SpendBot_DB`
- **Collection name:** `Spend` (all transactions — income & expense — are stored here, with categories already saved in Khmer)
- Budgets are stored in a separate `budgets` collection (one document per user/currency, overwritten on each new `/budget <amount>`)

## Example Usage

```
អ្នកប្រើ: ថ្ងៃនេះបង់ 20000 រៀល សម្រាប់អាហារថ្ងៃត្រង់
SpendBot: 💸 ចំណាយត្រូវបានកត់ត្រា!
          -20,000 រៀល — ម្ហូបអាហារ
          🆔 64f1a2b3c4d5e6f7g8h9i0j1

អ្នកប្រើ: ថវិកា 500000
SpendBot: ✅ បានកំណត់ថវិកាប្រចាំខែត្រឹម 500,000 រៀល

អ្នកប្រើ: [taps 📈 របាយការណ៍ button]
SpendBot: 📈 របាយការណ៍ប្រចាំខែ — ... (text report)
          [sends a pie-chart photo of the month's spending by category]
```

## Notes

- Currency defaults to **KHR (Riel)** if no currency is mentioned. Mention "USD"/"ដុល្លារ"/"$" to log a USD transaction instead.
- Budgets are tracked per currency — set `/budget 300 USD` (or "ថវិកា 300 ដុល្លារ") for a USD budget, or `/budget 500000` (or "ថវិកា 500000") for a KHR budget.
- The bot runs in long-polling mode by default — no public URL/webhook required, making it easy to run locally or on any always-on host (e.g. Render.com with PM2).
