import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Budgets are per-category, per-month, shared across the household (not per-user).
router.get('/', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month query param (YYYY-MM) is required.' });

  const rows = db
    .prepare(
      `SELECT c.id as categoryId, c.name, c.icon, c.color,
              COALESCE(b.amount, 0) as budget,
              COALESCE((SELECT SUM(e.amount) FROM expenses e
                        WHERE e.category_id = c.id AND strftime('%Y-%m', e.date) = ?), 0) as spent
       FROM categories c
       LEFT JOIN budgets b ON b.category_id = c.id AND b.month = ?
       ORDER BY c.is_default DESC, c.name ASC`
    )
    .all(month, month);

  res.json(
    rows.map((r) => ({
      ...r,
      remaining: r.budget - r.spent,
      percentUsed: r.budget > 0 ? Math.round((r.spent / r.budget) * 100) : null,
      status: r.budget === 0 ? 'none' : r.spent >= r.budget ? 'over' : r.spent >= r.budget * 0.85 ? 'warning' : 'ok',
    }))
  );
});

router.put('/', (req, res) => {
  const { month, categoryId, amount } = req.body;
  if (!month || !categoryId || amount == null) {
    return res.status(400).json({ error: 'month, categoryId, and amount are required.' });
  }
  db.prepare(
    `INSERT INTO budgets (category_id, month, amount) VALUES (?, ?, ?)
     ON CONFLICT(category_id, month) DO UPDATE SET amount = excluded.amount`
  ).run(categoryId, month, Number(amount));
  res.json({ ok: true });
});

export default router;
