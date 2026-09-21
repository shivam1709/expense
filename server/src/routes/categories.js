import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY is_default DESC, name ASC').all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      isDefault: !!r.is_default,
    }))
  );
});

router.post('/', (req, res) => {
  const { name, icon, color } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required.' });
  try {
    const info = db
      .prepare('INSERT INTO categories (name, icon, color, is_default) VALUES (?, ?, ?, 0)')
      .run(name.trim(), icon || '💰', color || '#6366f1');
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      isDefault: false,
    });
  } catch {
    res.status(400).json({ error: 'A category with that name already exists.' });
  }
});

router.delete('/:id', (req, res) => {
  const inUse = db
    .prepare('SELECT COUNT(*) as count FROM expenses WHERE category_id = ?')
    .get(req.params.id);
  if (inUse.count > 0) {
    return res.status(400).json({ error: 'Cannot delete a category with existing expenses.' });
  }
  db.prepare('DELETE FROM categories WHERE id = ? AND is_default = 0').run(req.params.id);
  res.json({ ok: true });
});

export default router;
