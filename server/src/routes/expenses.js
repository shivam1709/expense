import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function serializeExpense(row) {
  return {
    id: row.id,
    amount: row.amount,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    paidBy: row.paid_by,
    paidByName: row.paid_by_name,
    date: row.date,
    isShared: !!row.is_shared,
    splitType: row.split_type,
    splitPayerShare: row.split_payer_share,
    notes: row.notes,
    isRecurring: !!row.recurring_template_id,
    createdAt: row.created_at,
  };
}

const SELECT_BASE = `
  SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
         u.name as paid_by_name
  FROM expenses e
  JOIN categories c ON c.id = e.category_id
  JOIN users u ON u.id = e.paid_by
`;

router.get('/', (req, res) => {
  const { month, categoryId, paidBy, search, limit } = req.query;
  const clauses = [];
  const params = [];

  if (month) {
    clauses.push("strftime('%Y-%m', e.date) = ?");
    params.push(month);
  }
  if (categoryId) {
    clauses.push('e.category_id = ?');
    params.push(categoryId);
  }
  if (paidBy) {
    clauses.push('e.paid_by = ?');
    params.push(paidBy);
  }
  if (search) {
    clauses.push('(e.description LIKE ? OR e.notes LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  let sql = SELECT_BASE;
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY e.date DESC, e.id DESC';
  if (limit) {
    sql += ' LIMIT ?';
    params.push(Number(limit));
  }

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(serializeExpense));
});

router.get('/:id', (req, res) => {
  const row = db.prepare(SELECT_BASE + ' WHERE e.id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Expense not found' });
  res.json(serializeExpense(row));
});

function validateExpenseBody(body) {
  const { amount, description, categoryId, paidBy, date } = body;
  if (!amount || Number(amount) <= 0) return 'Amount must be a positive number.';
  if (!description || !description.trim()) return 'Description is required.';
  if (!categoryId) return 'Category is required.';
  if (!paidBy) return 'Payer is required.';
  if (!date) return 'Date is required.';
  if (body.isShared && body.splitType === 'custom') {
    const share = Number(body.splitPayerShare);
    if (Number.isNaN(share) || share < 0 || share > 100) {
      return 'Custom split share must be between 0 and 100.';
    }
  }
  return null;
}

router.post('/', (req, res) => {
  const err = validateExpenseBody(req.body);
  if (err) return res.status(400).json({ error: err });

  const {
    amount,
    description,
    categoryId,
    paidBy,
    date,
    isShared,
    splitType,
    splitPayerShare,
    notes,
  } = req.body;

  const info = db
    .prepare(
      `INSERT INTO expenses (amount, description, category_id, paid_by, date, is_shared, split_type, split_payer_share, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      Number(amount),
      description.trim(),
      categoryId,
      paidBy,
      date,
      isShared ? 1 : 0,
      isShared ? (splitType || 'equal') : 'none',
      isShared ? (splitType === 'custom' ? Number(splitPayerShare) : 50) : 100,
      notes ? notes.trim() : null
    );

  const row = db.prepare(SELECT_BASE + ' WHERE e.id = ?').get(info.lastInsertRowid);
  res.status(201).json(serializeExpense(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  const err = validateExpenseBody(req.body);
  if (err) return res.status(400).json({ error: err });

  const {
    amount,
    description,
    categoryId,
    paidBy,
    date,
    isShared,
    splitType,
    splitPayerShare,
    notes,
  } = req.body;

  db.prepare(
    `UPDATE expenses SET amount=?, description=?, category_id=?, paid_by=?, date=?, is_shared=?, split_type=?, split_payer_share=?, notes=?
     WHERE id=?`
  ).run(
    Number(amount),
    description.trim(),
    categoryId,
    paidBy,
    date,
    isShared ? 1 : 0,
    isShared ? (splitType || 'equal') : 'none',
    isShared ? (splitType === 'custom' ? Number(splitPayerShare) : 50) : 100,
    notes ? notes.trim() : null,
    req.params.id
  );

  const row = db.prepare(SELECT_BASE + ' WHERE e.id = ?').get(req.params.id);
  res.json(serializeExpense(row));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Monthly category breakdown for the statement pie chart.
router.get('/stats/summary', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month query param (YYYY-MM) is required.' });

  const rows = db
    .prepare(
      `SELECT c.id as categoryId, c.name, c.icon, c.color, SUM(e.amount) as total, COUNT(*) as count
       FROM expenses e JOIN categories c ON c.id = e.category_id
       WHERE strftime('%Y-%m', e.date) = ?
       GROUP BY c.id ORDER BY total DESC`
    )
    .all(month);

  const totalRow = db
    .prepare(`SELECT SUM(amount) as total, COUNT(*) as count FROM expenses WHERE strftime('%Y-%m', date) = ?`)
    .get(month);

  // "Who fronted the cash" — useful for settle-up context.
  const byPayer = db
    .prepare(
      `SELECT u.id as userId, u.name, u.color, SUM(e.amount) as total
       FROM expenses e JOIN users u ON u.id = e.paid_by
       WHERE strftime('%Y-%m', e.date) = ?
       GROUP BY u.id`
    )
    .all(month);

  // "Who actually spent it" — a shared expense's cost is split between both people
  // according to its split, regardless of who paid the bill upfront.
  const users = db.prepare('SELECT id, name, color FROM users ORDER BY id ASC').all();
  const monthExpenses = db
    .prepare(
      `SELECT amount, paid_by, is_shared, split_payer_share FROM expenses WHERE strftime('%Y-%m', date) = ?`
    )
    .all(month);
  const personTotals = new Map(users.map((u) => [u.id, 0]));
  for (const e of monthExpenses) {
    if (!e.is_shared) {
      personTotals.set(e.paid_by, (personTotals.get(e.paid_by) || 0) + e.amount);
      continue;
    }
    const otherUser = users.find((u) => u.id !== e.paid_by);
    const payerShare = e.amount * (e.split_payer_share / 100);
    const otherShare = e.amount - payerShare;
    personTotals.set(e.paid_by, (personTotals.get(e.paid_by) || 0) + payerShare);
    if (otherUser) personTotals.set(otherUser.id, (personTotals.get(otherUser.id) || 0) + otherShare);
  }
  const byPerson = users.map((u) => ({
    userId: u.id,
    name: u.name,
    color: u.color,
    total: Math.round((personTotals.get(u.id) || 0) * 100) / 100,
  }));

  const prevMonth = shiftMonth(month, -1);
  const prevTotalRow = db
    .prepare(`SELECT SUM(amount) as total FROM expenses WHERE strftime('%Y-%m', date) = ?`)
    .get(prevMonth);

  res.json({
    month,
    total: totalRow.total || 0,
    count: totalRow.count || 0,
    categories: rows,
    byPayer,
    byPerson,
    previousMonthTotal: prevTotalRow.total || 0,
  });
});

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Trend across the last N months (default 6) for the spending trend chart.
router.get('/stats/trend', (req, res) => {
  const months = Number(req.query.months) || 6;
  const now = new Date();
  const labels = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    labels.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  const stmt = db.prepare(
    `SELECT SUM(amount) as total FROM expenses WHERE strftime('%Y-%m', date) = ?`
  );
  const data = labels.map((month) => ({ month, total: stmt.get(month).total || 0 }));
  res.json(data);
});

export default router;
