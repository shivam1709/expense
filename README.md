# Our Expenses

A shared expense tracker built for two people. Add expenses, split shared
costs, track monthly budgets per category, see spending statements with a
pie chart, manage recurring bills/subscriptions, and settle up who owes
whom. Installable to your phone's home screen as a PWA — no app store
needed.

## Features

- **Expense tracking** — add/edit/delete expenses with category, date, notes
- **Shared expenses** — mark any expense as shared and split it 50/50 or by
  a custom percentage; a running balance shows who owes whom
- **Settle up** — record payments between the two of you to clear the balance
- **Monthly statements** — total spend, category breakdown pie chart, month
  vs. month comparison
- **Budgets** — set a monthly budget per category with progress bars and
  over-budget warnings
- **Recurring expenses** — rent, subscriptions, etc. auto-added each month
- **Spending trend** — 6-month trend chart
- **Dark mode**
- **Installable PWA** — add to your phone's home screen and use it like a
  native app, works offline for the shell

## Tech stack

- **Server:** Node.js, Express, SQLite (`better-sqlite3`), JWT auth
- **Client:** React, Vite, Tailwind CSS, Recharts, `vite-plugin-pwa`

## Getting started

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure the server (optional)

```bash
cd server
cp .env.example .env
# edit .env and set a real JWT_SECRET
```

### 3. Run in development

In one terminal:

```bash
cd server && npm run dev
```

In another:

```bash
cd client && npm run dev
```

Open http://localhost:5173. The first time you visit, you'll be walked
through creating accounts for the two of you (this app only ever supports
exactly two people).

### 4. Run in production (single server)

```bash
cd client && npm run build
cd ../server && npm start
```

The server serves the built client directly, so you only need one process
at http://localhost:4000 (or whatever `PORT` you set).

### 5. Install it on your phone

Open the site in your phone's browser and choose "Add to Home Screen"
(Safari) or "Install app" (Chrome). It'll behave like a native app icon.

## Data

All data lives in a local SQLite file at `server/data/expense.db`. Back it
up if you care about your history — there's no cloud sync built in, by
design, since this is just for the two of you.
