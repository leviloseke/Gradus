import { Router } from 'express';
import { query } from '../db.js';
import { suggestNext, calcWarmups } from '../progression.js';

const router = Router();

const TEMPLATE_FIELDS = `id, user_id, name, category, warmup_sets, working_sets_count,
  target_rep_min, target_rep_max, max_effort_sets, progression_rule, created_at`;

// User's own templates + default library
router.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT ${TEMPLATE_FIELDS}, (user_id IS NULL) AS is_library
       FROM exercise_templates
      WHERE user_id = $1 OR user_id IS NULL
      ORDER BY (user_id IS NULL), category NULLS LAST, name`,
    [req.userId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const {
    name, category, warmup_sets, working_sets_count,
    target_rep_min, target_rep_max, max_effort_sets, progression_rule,
  } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { rows } = await query(
    `INSERT INTO exercise_templates
       (user_id, name, category, warmup_sets, working_sets_count,
        target_rep_min, target_rep_max, max_effort_sets, progression_rule)
     VALUES ($1, $2, $3, COALESCE($4, '{"sets":[]}'::jsonb), COALESCE($5, 3),
             COALESCE($6, 5), COALESCE($7, 8), COALESCE($8, 'last_2'),
             COALESCE($9, '{"trigger":"hits_max_reps","action":"increase_weight","amount":5,"unit":"lbs"}'::jsonb))
     RETURNING ${TEMPLATE_FIELDS}`,
    [req.userId, name, category || null,
     warmup_sets ? JSON.stringify(warmup_sets) : null, working_sets_count,
     target_rep_min, target_rep_max, max_effort_sets,
     progression_rule ? JSON.stringify(progression_rule) : null]
  );
  res.status(201).json(rows[0]);
});

async function getTemplate(id, userId) {
  const { rows } = await query(
    `SELECT ${TEMPLATE_FIELDS} FROM exercise_templates
      WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
    [id, userId]
  );
  return rows[0];
}

router.get('/:id', async (req, res) => {
  const tpl = await getTemplate(req.params.id, req.userId);
  if (!tpl) return res.status(404).json({ error: 'Exercise not found' });
  res.json(tpl);
});

router.put('/:id', async (req, res) => {
  const {
    name, category, warmup_sets, working_sets_count,
    target_rep_min, target_rep_max, max_effort_sets, progression_rule,
  } = req.body || {};
  const { rows } = await query(
    `UPDATE exercise_templates SET
        name = COALESCE($3, name),
        category = COALESCE($4, category),
        warmup_sets = COALESCE($5, warmup_sets),
        working_sets_count = COALESCE($6, working_sets_count),
        target_rep_min = COALESCE($7, target_rep_min),
        target_rep_max = COALESCE($8, target_rep_max),
        max_effort_sets = COALESCE($9, max_effort_sets),
        progression_rule = COALESCE($10, progression_rule)
      WHERE id = $1 AND user_id = $2
      RETURNING ${TEMPLATE_FIELDS}`,
    [req.params.id, req.userId, name, category,
     warmup_sets ? JSON.stringify(warmup_sets) : null, working_sets_count,
     target_rep_min, target_rep_max, max_effort_sets,
     progression_rule ? JSON.stringify(progression_rule) : null]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Exercise not found or not editable' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM exercise_templates WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Exercise not found or not deletable' });
  res.json({ ok: true });
});

// Next-session suggestion + resolved warm-ups for a given working weight
router.get('/:id/next', async (req, res) => {
  const tpl = await getTemplate(req.params.id, req.userId);
  if (!tpl) return res.status(404).json({ error: 'Exercise not found' });
  const suggestion = await suggestNext(req.userId, tpl);
  const weight = Number(req.query.working_weight) || suggestion.suggested_weight;
  res.json({
    ...suggestion,
    warmups: weight ? calcWarmups(tpl.warmup_sets, weight) : [],
  });
});

// Per-exercise session history
router.get('/:id/history', async (req, res) => {
  const tpl = await getTemplate(req.params.id, req.userId);
  if (!tpl) return res.status(404).json({ error: 'Exercise not found' });
  const { rows } = await query(
    `SELECT s.id AS session_id, s.session_date, s.is_deload,
            json_agg(json_build_object(
              'set_number', l.set_number, 'set_type', l.set_type,
              'weight_used', l.weight_used, 'reps_completed', l.reps_completed,
              'rpe', l.rpe, 'rir', l.rir, 'notes', l.notes
            ) ORDER BY l.set_type DESC, l.set_number) AS sets
       FROM workout_sessions s
       JOIN workout_set_logs l ON l.session_id = s.id
      WHERE s.user_id = $1 AND l.exercise_id = $2
      GROUP BY s.id
      ORDER BY s.session_date DESC, s.created_at DESC
      LIMIT $3`,
    [req.userId, req.params.id, Number(req.query.limit) || 50]
  );
  res.json(rows);
});

// Per-exercise stats: top weight over time, PRs, average reps
router.get('/:id/stats', async (req, res) => {
  const tpl = await getTemplate(req.params.id, req.userId);
  if (!tpl) return res.status(404).json({ error: 'Exercise not found' });

  const series = await query(
    `SELECT s.session_date, max(l.weight_used) AS top_weight,
            round(avg(l.reps_completed), 1) AS avg_reps,
            max(l.weight_used * (1 + l.reps_completed / 30.0)) AS est_1rm
       FROM workout_sessions s
       JOIN workout_set_logs l ON l.session_id = s.id
      WHERE s.user_id = $1 AND l.exercise_id = $2 AND l.set_type = 'working'
      GROUP BY s.session_date
      ORDER BY s.session_date`,
    [req.userId, req.params.id]
  );

  const pr = await query(
    `SELECT l.weight_used, l.reps_completed, s.session_date
       FROM workout_set_logs l
       JOIN workout_sessions s ON s.id = l.session_id
      WHERE s.user_id = $1 AND l.exercise_id = $2 AND l.set_type = 'working'
      ORDER BY l.weight_used DESC, l.reps_completed DESC
      LIMIT 1`,
    [req.userId, req.params.id]
  );

  res.json({
    exercise: { id: tpl.id, name: tpl.name },
    series: series.rows,
    personal_record: pr.rows[0] || null,
  });
});

export default router;
