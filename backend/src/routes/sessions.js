import { Router } from 'express';
import { query } from '../db.js';
import { suggestNext, calcWarmups, resolveMaxEffortIndexes, deloadHint } from '../progression.js';

const router = Router();

router.post('/', async (req, res) => {
  const { workout_day_id, session_date, is_deload, notes } = req.body || {};
  if (workout_day_id) {
    const owned = await query(
      `SELECT d.id FROM workout_days d
         JOIN workout_programs p ON p.id = d.program_id
        WHERE d.id = $1 AND p.user_id = $2`,
      [workout_day_id, req.userId]
    );
    if (!owned.rows[0]) return res.status(404).json({ error: 'Workout day not found' });
  }
  const { rows } = await query(
    `INSERT INTO workout_sessions (user_id, workout_day_id, session_date, is_deload, notes)
     VALUES ($1, $2, COALESCE($3, CURRENT_DATE), COALESCE($4, false), $5)
     RETURNING *`,
    [req.userId, workout_day_id || null, session_date || null, is_deload, notes || null]
  );
  res.status(201).json(rows[0]);
});

router.get('/', async (req, res) => {
  const { from, to, program_id, limit } = req.query;
  const params = [req.userId];
  let where = 's.user_id = $1';
  if (from) { params.push(from); where += ` AND s.session_date >= $${params.length}`; }
  if (to) { params.push(to); where += ` AND s.session_date <= $${params.length}`; }
  if (program_id) { params.push(program_id); where += ` AND d.program_id = $${params.length}`; }
  params.push(Math.min(Number(limit) || 100, 500));
  const { rows } = await query(
    `SELECT s.*, d.name AS day_name, p.name AS program_name,
            (SELECT count(*) FROM workout_set_logs l WHERE l.session_id = s.id)::int AS set_count
       FROM workout_sessions s
       LEFT JOIN workout_days d ON d.id = s.workout_day_id
       LEFT JOIN workout_programs p ON p.id = d.program_id
      WHERE ${where}
      ORDER BY s.session_date DESC, s.created_at DESC
      LIMIT $${params.length}`,
    params
  );
  res.json(rows);
});

async function ownSession(id, userId) {
  const { rows } = await query(
    'SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rows[0];
}

router.get('/:id', async (req, res) => {
  const session = await ownSession(req.params.id, req.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const sets = await query(
    `SELECT l.*, e.name AS exercise_name
       FROM workout_set_logs l
       JOIN exercise_templates e ON e.id = l.exercise_id
      WHERE l.session_id = $1
      ORDER BY l.created_at, l.set_type DESC, l.set_number`,
    [req.params.id]
  );
  const day = session.workout_day_id
    ? (await query('SELECT name FROM workout_days WHERE id = $1', [session.workout_day_id])).rows[0]
    : null;
  res.json({ ...session, day_name: day?.name || null, sets: sets.rows });
});

router.put('/:id', async (req, res) => {
  const { session_date, is_deload, notes, completed } = req.body || {};
  const { rows } = await query(
    `UPDATE workout_sessions SET
        session_date = COALESCE($3, session_date),
        is_deload = COALESCE($4, is_deload),
        notes = COALESCE($5, notes),
        completed_at = CASE WHEN $6::boolean IS true THEN now() ELSE completed_at END
      WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.userId, session_date, is_deload, notes, completed ?? null]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Session not found' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM workout_sessions WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Session not found' });
  res.json({ ok: true });
});

// The session's planned exercises with progression suggestions and warm-ups
router.get('/:id/plan', async (req, res) => {
  const session = await ownSession(req.params.id, req.userId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const deload_hint = await deloadHint(req.userId);
  if (!session.workout_day_id) return res.json({ session, exercises: [], deload_hint });

  const { rows } = await query(
    `SELECT de.id AS day_exercise_id, de."order", de.rest_seconds, de.notes AS day_notes,
            e.id, e.name, e.category, e.warmup_sets, e.working_sets_count,
            e.target_rep_min, e.target_rep_max, e.max_effort_sets, e.progression_rule
       FROM workout_day_exercises de
       JOIN exercise_templates e ON e.id = de.exercise_template_id
      WHERE de.workout_day_id = $1
      ORDER BY de."order"`,
    [session.workout_day_id]
  );

  const exercises = await Promise.all(
    rows.map(async (e) => {
      const suggestion = await suggestNext(req.userId, e);
      const workingWeight = suggestion.suggested_weight;
      return {
        ...e,
        suggestion,
        warmups: workingWeight ? calcWarmups(e.warmup_sets, workingWeight) : [],
        max_effort_set_numbers: resolveMaxEffortIndexes(e.max_effort_sets, e.working_sets_count),
      };
    })
  );

  res.json({ session, exercises, deload_hint });
});

// ----- Set logs -----

router.post('/:id/sets', async (req, res) => {
  if (!(await ownSession(req.params.id, req.userId)))
    return res.status(404).json({ error: 'Session not found' });
  const { exercise_id, set_number, set_type, weight_used, reps_completed, rpe, rir, notes } = req.body || {};
  if (!exercise_id || set_number == null || !set_type || weight_used == null || reps_completed == null) {
    return res.status(400).json({ error: 'exercise_id, set_number, set_type, weight_used, reps_completed are required' });
  }
  const { rows } = await query(
    `INSERT INTO workout_set_logs
       (session_id, exercise_id, set_number, set_type, weight_used, reps_completed, rpe, rir, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [req.params.id, exercise_id, set_number, set_type, weight_used, reps_completed,
     rpe ?? null, rir ?? null, notes || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id/sets/:setId', async (req, res) => {
  if (!(await ownSession(req.params.id, req.userId)))
    return res.status(404).json({ error: 'Session not found' });
  const { weight_used, reps_completed, rpe, rir, notes } = req.body || {};
  const { rows } = await query(
    `UPDATE workout_set_logs SET
        weight_used = COALESCE($3, weight_used),
        reps_completed = COALESCE($4, reps_completed),
        rpe = $5, rir = $6, notes = COALESCE($7, notes)
      WHERE id = $1 AND session_id = $2 RETURNING *`,
    [req.params.setId, req.params.id, weight_used, reps_completed, rpe ?? null, rir ?? null, notes]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Set not found' });
  res.json(rows[0]);
});

router.delete('/:id/sets/:setId', async (req, res) => {
  if (!(await ownSession(req.params.id, req.userId)))
    return res.status(404).json({ error: 'Session not found' });
  const { rowCount } = await query(
    'DELETE FROM workout_set_logs WHERE id = $1 AND session_id = $2',
    [req.params.setId, req.params.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Set not found' });
  res.json({ ok: true });
});

export default router;
