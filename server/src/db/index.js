import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DB_DIR || path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'expense.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '💰',
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  paid_by INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  is_shared INTEGER NOT NULL DEFAULT 0,
  split_type TEXT NOT NULL DEFAULT 'none',
  split_payer_share REAL NOT NULL DEFAULT 100,
  notes TEXT,
  recurring_template_id INTEGER REFERENCES recurring_templates(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  month TEXT NOT NULL,
  amount REAL NOT NULL,
  UNIQUE(category_id, month)
);

CREATE TABLE IF NOT EXISTS recurring_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  paid_by INTEGER NOT NULL REFERENCES users(id),
  is_shared INTEGER NOT NULL DEFAULT 0,
  split_type TEXT NOT NULL DEFAULT 'none',
  split_payer_share REAL NOT NULL DEFAULT 100,
  day_of_month INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  last_generated TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user INTEGER NOT NULL REFERENCES users(id),
  to_user INTEGER NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
`);

const defaultCategories = [
  ['Groceries', '🛒', '#22c55e'],
  ['Rent', '🏠', '#6366f1'],
  ['Utilities', '💡', '#f59e0b'],
  ['Dining Out', '🍽️', '#ef4444'],
  ['Transport', '🚗', '#0ea5e9'],
  ['Entertainment', '🎬', '#a855f7'],
  ['Subscriptions', '📺', '#ec4899'],
  ['Shopping', '🛍️', '#f97316'],
  ['Health', '💊', '#14b8a6'],
  ['Travel', '✈️', '#3b82f6'],
  ['Gifts', '🎁', '#d946ef'],
  ['Other', '📦', '#64748b'],
];

const insertCategory = db.prepare(
  'INSERT OR IGNORE INTO categories (name, icon, color, is_default) VALUES (?, ?, ?, 1)'
);
const seedCategories = db.transaction((cats) => {
  for (const [name, icon, color] of cats) insertCategory.run(name, icon, color);
});
seedCategories(defaultCategories);

export default db;
