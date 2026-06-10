import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// Overview of progression across all exercises the user has logged
router.get('/progression', async (req, res) => {
  const { rows } = await query(
    `WITH per_session AS (
       SELECT l.exercise_id, s.session_date, max(l.weight_used) AS top_weight
         FROM workout_set_logs l
         JOIN workout_sessions s ON s.id = l.session_id
        WHERE s.user_id = $1 AND l.set_type = 'working'
        GROUP BY l.exercise_id, s.session_date
     ),
     bounds AS (
       SELECT exercise_id,
              min(session_date) AS first_date, max(session_date) AS last_date,
              count(*)::int AS session_count
         FROM per_session GROUP BY exercise_id
     )
     SELECT e.id, e.name, e.category, b.session_count, b.first_date, b.last_date,
            f.top_weight AS first_weight, l.top_weight AS last_weight,
            (l.top_weight - f.top_weight) AS weight_change
       FROM bounds b
       JOIN exercise_templates e ON e.id = b.exercise_id
       JOIN per_session f ON f.exercise_id = b.exercise_id AND f.session_date = b.first_date
       JOIN per_session l ON l.exercise_id = b.exercise_id AND l.session_date = b.last_date
      ORDER BY e.name`,
    [req.userId]
  );
  res.json(rows);
});

export default router;
