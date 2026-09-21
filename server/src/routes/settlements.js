import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function computeBalance() {
  const users = db.prepare('SELECT id, name, color FROM users ORDER BY id ASC').all();
  if (users.length < 2) return { users, netAmount: 0, owedBy: null, owedTo: null };
  const [u1, u2] = users;

  // debts[x][y] = how much x owes y, accumulated from shared expenses.
  const debts = { [u1.id]: { [u2.id]: 0 }, [u2.id]: { [u1.id]: 0 } };

  const sharedExpenses = db
    .prepare('SELECT amount, paid_by, split_payer_share FROM expenses WHERE is_shared = 1')
    .all();

  for (const e of sharedExpenses) {
    const otherId = e.paid_by === u1.id ? u2.id : u1.id;
    const otherShareOfAmount = e.amount * ((100 - e.split_payer_share) / 100);
    debts[otherId][e.paid_by] += otherShareOfAmount;
  }

  const settlements = db.prepare('SELECT from_user, to_user, amount FROM settlements').all();
  for (const s of settlements) {
    if (debts[s.from_user] && debts[s.from_user][s.to_user] != null) {
      debts[s.from_user][s.to_user] -= s.amount;
    }
  }

  const net = debts[u1.id][u2.id] - debts[u2.id][u1.id];
  const rounded = Math.round(net * 100) / 100;

  return {
    users,
    netAmount: Math.abs(rounded),
    owedBy: rounded > 0 ? u1.id : rounded < 0 ? u2.id : null,
    owedTo: rounded > 0 ? u2.id : rounded < 0 ? u1.id : null,
  };
}

router.get('/balance', (req, res) => {
  res.json(computeBalance());
});

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, uf.name as from_name, ut.name as to_name
       FROM settlements s
       JOIN users uf ON uf.id = s.from_user
       JOIN users ut ON ut.id = s.to_user
       ORDER BY s.date DESC, s.id DESC`
    )
    .all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      fromUser: r.from_user,
      fromName: r.from_name,
      toUser: r.to_user,
      toName: r.to_name,
      amount: r.amount,
      date: r.date,
      note: r.note,
    }))
  );
});

router.post('/', (req, res) => {
  const { fromUser, toUser, amount, date, note } = req.body;
  if (!fromUser || !toUser || !amount || Number(amount) <= 0 || !date) {
    return res.status(400).json({ error: 'fromUser, toUser, amount, and date are required.' });
  }
  if (fromUser === toUser) return res.status(400).json({ error: 'A person cannot settle up with themself.' });

  const info = db
    .prepare('INSERT INTO settlements (from_user, to_user, amount, date, note) VALUES (?, ?, ?, ?, ?)')
    .run(fromUser, toUser, Number(amount), date, note ? note.trim() : null);

  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM settlements WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
