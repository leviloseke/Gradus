import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT p.*,
            (SELECT count(*) FROM workout_days d WHERE d.program_id = p.id)::int AS day_count
       FROM workout_programs p WHERE p.user_id = $1 ORDER BY p.created_at`,
    [req.userId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await query(
    `INSERT INTO workout_programs (user_id, name, description)
     VALUES ($1, $2, $3) RETURNING *`,
    [req.userId, name, description || null]
  );
  res.status(201).json(rows[0]);
});

router.get('/:id', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM workout_programs WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Program not found' });

  const days = await query(
    `SELECT d.*, COALESCE(json_agg(
              json_build_object(
                'id', de.id, 'order', de."order", 'rest_seconds', de.rest_seconds,
                'notes', de.notes, 'exercise_template_id', de.exercise_template_id,
                'exercise', json_build_object(
                  'id', e.id, 'name', e.name, 'category', e.category,
                  'warmup_sets', e.warmup_sets, 'working_sets_count', e.working_sets_count,
                  'target_rep_min', e.target_rep_min, 'target_rep_max', e.target_rep_max,
                  'max_effort_sets', e.max_effort_sets, 'progression_rule', e.progression_rule
                )
              ) ORDER BY de."order"
            ) FILTER (WHERE de.id IS NOT NULL), '[]') AS exercises
       FROM workout_days d
       LEFT JOIN workout_day_exercises de ON de.workout_day_id = d.id
       LEFT JOIN exercise_templates e ON e.id = de.exercise_template_id
      WHERE d.program_id = $1
      GROUP BY d.id
      ORDER BY d."order"`,
    [req.params.id]
  );
  res.json({ ...rows[0], days: days.rows });
});

router.put('/:id', async (req, res) => {
  const { name, description } = req.body || {};
  const { rows } = await query(
    `UPDATE workout_programs SET name = COALESCE($3, name), description = $4
      WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.userId, name, description ?? null]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Program not found' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM workout_programs WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Program not found' });
  res.json({ ok: true });
});

// ----- Days -----

async function ownProgram(programId, userId) {
  const { rows } = await query(
    'SELECT id FROM workout_programs WHERE id = $1 AND user_id = $2',
    [programId, userId]
  );
  return !!rows[0];
}

router.get('/:id/days', async (req, res) => {
  if (!(await ownProgram(req.params.id, req.userId)))
    return res.status(404).json({ error: 'Program not found' });
  const { rows } = await query(
    'SELECT * FROM workout_days WHERE program_id = $1 ORDER BY "order"',
    [req.params.id]
  );
  res.json(rows);
});

router.post('/:id/days', async (req, res) => {
  if (!(await ownProgram(req.params.id, req.userId)))
    return res.status(404).json({ error: 'Program not found' });
  const { name, order } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await query(
    `INSERT INTO workout_days (program_id, name, "order")
     VALUES ($1, $2, COALESCE($3, (SELECT COALESCE(max("order"), -1) + 1 FROM workout_days WHERE program_id = $1)))
     RETURNING *`,
    [req.params.id, name, order ?? null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:programId/days/:dayId', async (req, res) => {
  if (!(await ownProgram(req.params.programId, req.userId)))
    return res.status(404).json({ error: 'Program not found' });
  const { name, order } = req.body || {};
  const { rows } = await query(
    `UPDATE workout_days SET name = COALESCE($3, name), "order" = COALESCE($4, "order")
      WHERE id = $1 AND program_id = $2 RETURNING *`,
    [req.params.dayId, req.params.programId, name, order]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Day not found' });
  res.json(rows[0]);
});

router.delete('/:programId/days/:dayId', async (req, res) => {
  if (!(await ownProgram(req.params.programId, req.userId)))
    return res.status(404).json({ error: 'Program not found' });
  const { rowCount } = await query(
    'DELETE FROM workout_days WHERE id = $1 AND program_id = $2',
    [req.params.dayId, req.params.programId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Day not found' });
  res.json({ ok: true });
});

// ----- Day exercises -----

router.post('/:programId/days/:dayId/exercises', async (req, res) => {
  if (!(await ownProgram(req.params.programId, req.userId)))
    return res.status(404).json({ error: 'Program not found' });
  const { exercise_template_id, order, rest_seconds, notes } = req.body || {};
  if (!exercise_template_id)
    return res.status(400).json({ error: 'exercise_template_id is required' });
  // Template must be the user's own or from the default library
  const tpl = await query(
    'SELECT id FROM exercise_templates WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
    [exercise_template_id, req.userId]
  );
  if (!tpl.rows[0]) return res.status(404).json({ error: 'Exercise template not found' });
  const { rows } = await query(
    `INSERT INTO workout_day_exercises (workout_day_id, exercise_template_id, "order", rest_seconds, notes)
     VALUES ($1, $2,
             COALESCE($3, (SELECT COALESCE(max("order"), -1) + 1 FROM workout_day_exercises WHERE workout_day_id = $1)),
             COALESCE($4, 120), $5)
     RETURNING *`,
    [req.params.dayId, exercise_template_id, order ?? null, rest_seconds ?? null, notes || null]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:programId/days/:dayId/exercises/:exerciseId', async (req, res) => {
  if (!(await ownProgram(req.params.programId, req.userId)))
    return res.status(404).json({ error: 'Program not found' });
  const { rowCount } = await query(
    'DELETE FROM workout_day_exercises WHERE id = $1 AND workout_day_id = $2',
    [req.params.exerciseId, req.params.dayId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Exercise not found on this day' });
  res.json({ ok: true });
});

export default router;
