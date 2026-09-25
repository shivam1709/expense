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

## Deploying so both of you can use it from anywhere

Running it on one laptop only works on the same Wi-Fi. To reach it from your
phones anywhere (mobile data included), deploy it to [Fly.io](https://fly.io) —
it has a free-tier VM plus a persistent volume, which this repo is already
set up for (`Dockerfile` + `fly.toml`).

1. **Install the Fly CLI and sign up:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth signup   # or `fly auth login` if you already have an account
   ```
   Fly's free allowance still requires a card on file for verification.

2. **Pick a unique app name** and put it in `fly.toml` (Fly app names are
   global — `our-expenses-changeme` is just a placeholder):
   ```bash
   sed -i '' 's/our-expenses-changeme/your-unique-name-here/' fly.toml   # macOS
   # or: sed -i 's/our-expenses-changeme/your-unique-name-here/' fly.toml   # Linux
   ```

3. **Create the app, volume, and secret, then deploy:**
   ```bash
   fly apps create your-unique-name-here
   fly volumes create expense_data --size 1 --region iad
   fly secrets set JWT_SECRET="$(openssl rand -hex 32)"
   fly deploy
   ```

4. **Open it:**
   ```bash
   fly open
   ```
   You'll land on the same setup screen — create your two accounts, then add
   the `https://your-unique-name-here.fly.dev` URL to both your home screens.

Your SQLite data lives on the Fly volume and survives redeploys and restarts.
To ship a future update, just run `fly deploy` again from the repo root.

## Data

All data lives in a local SQLite file at `server/data/expense.db`. Back it
up if you care about your history — there's no cloud sync built in, by
design, since this is just for the two of you.
