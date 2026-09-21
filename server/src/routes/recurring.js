import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function serialize(row) {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    paidBy: row.paid_by,
    paidByName: row.paid_by_name,
    isShared: !!row.is_shared,
    splitType: row.split_type,
    splitPayerShare: row.split_payer_share,
    dayOfMonth: row.day_of_month,
    active: !!row.active,
    lastGenerated: row.last_generated,
  };
}

const SELECT_BASE = `
  SELECT r.*, c.name as category_name, c.icon as category_icon, u.name as paid_by_name
  FROM recurring_templates r
  JOIN categories c ON c.id = r.category_id
  JOIN users u ON u.id = r.paid_by
`;

router.get('/', (req, res) => {
  const rows = db.prepare(SELECT_BASE + ' ORDER BY r.active DESC, r.day_of_month ASC').all();
  res.json(rows.map(serialize));
});

router.post('/', (req, res) => {
  const { description, amount, categoryId, paidBy, isShared, splitType, splitPayerShare, dayOfMonth } =
    req.body;
  if (!description || !amount || !categoryId || !paidBy) {
    return res.status(400).json({ error: 'description, amount, categoryId, and paidBy are required.' });
  }
  const day = Math.min(28, Math.max(1, Number(dayOfMonth) || 1));

  const info = db
    .prepare(
      `INSERT INTO recurring_templates (description, amount, category_id, paid_by, is_shared, split_type, split_payer_share, day_of_month)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      description.trim(),
      Number(amount),
      categoryId,
      paidBy,
      isShared ? 1 : 0,
      isShared ? (splitType || 'equal') : 'none',
      isShared ? (splitType === 'custom' ? Number(splitPayerShare) : 50) : 100,
      day
    );

  const row = db.prepare(SELECT_BASE + ' WHERE r.id = ?').get(info.lastInsertRowid);
  res.status(201).json(serialize(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM recurring_templates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Recurring expense not found' });

  const { description, amount, categoryId, paidBy, isShared, splitType, splitPayerShare, dayOfMonth, active } =
    req.body;
  const day = Math.min(28, Math.max(1, Number(dayOfMonth) || 1));

  db.prepare(
    `UPDATE recurring_templates SET description=?, amount=?, category_id=?, paid_by=?, is_shared=?, split_type=?, split_payer_share=?, day_of_month=?, active=?
     WHERE id=?`
  ).run(
    description.trim(),
    Number(amount),
    categoryId,
    paidBy,
    isShared ? 1 : 0,
    isShared ? (splitType || 'equal') : 'none',
    isShared ? (splitType === 'custom' ? Number(splitPayerShare) : 50) : 100,
    day,
    active ? 1 : 0,
    req.params.id
  );

  const row = db.prepare(SELECT_BASE + ' WHERE r.id = ?').get(req.params.id);
  res.json(serialize(row));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM recurring_templates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Generates expense rows for any active recurring template that is due for the current month
// and hasn't already been generated. Safe to call repeatedly (idempotent per month).
export function generateDueRecurringExpenses() {
  const today = new Date();
  const currentMonth = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
  const currentDay = today.getUTCDate();

  const due = db
    .prepare(
      `SELECT * FROM recurring_templates
       WHERE active = 1
         AND day_of_month <= ?
         AND (last_generated IS NULL OR last_generated != ?)`
    )
    .all(currentDay, currentMonth);

  if (!due.length) return 0;

  const insertExpense = db.prepare(
    `INSERT INTO expenses (amount, description, category_id, paid_by, date, is_shared, split_type, split_payer_share, notes, recurring_template_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const markGenerated = db.prepare('UPDATE recurring_templates SET last_generated = ? WHERE id = ?');

  const tx = db.transaction((templates) => {
    for (const t of templates) {
      const date = `${currentMonth}-${String(t.day_of_month).padStart(2, '0')}`;
      insertExpense.run(
        t.amount,
        t.description,
        t.category_id,
        t.paid_by,
        date,
        t.is_shared,
        t.split_type,
        t.split_payer_share,
        'Auto-generated recurring expense',
        t.id
      );
      markGenerated.run(currentMonth, t.id);
    }
  });
  tx(due);
  return due.length;
}

export default router;
