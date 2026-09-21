import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, name, color FROM users ORDER BY id ASC').all();
  res.json(rows);
});

export default router;
