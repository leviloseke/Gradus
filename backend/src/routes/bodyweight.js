import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM body_weight_logs WHERE user_id = $1
      ORDER BY log_date DESC, created_at DESC LIMIT $2`,
    [req.userId, Math.min(Number(req.query.limit) || 365, 2000)]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { weight, log_date, notes } = req.body || {};
  if (weight == null) return res.status(400).json({ error: 'weight is required' });
  const { rows } = await query(
    `INSERT INTO body_weight_logs (user_id, weight, log_date, notes)
     VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4) RETURNING *`,
    [req.userId, weight, log_date || null, notes || null]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM body_weight_logs WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Entry not found' });
  res.json({ ok: true });
});

export default router;
