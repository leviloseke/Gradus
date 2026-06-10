import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const csvEscape = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (headers, rows) =>
  [headers.join(','), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','))].join('\n');

// CSV of all logged sets
router.get('/csv', async (req, res) => {
  const { rows } = await query(
    `SELECT to_char(s.session_date, 'YYYY-MM-DD') AS session_date,
            p.name AS program, d.name AS day, e.name AS exercise,
            l.set_type, l.set_number, l.weight_used, l.reps_completed, l.rpe, l.rir,
            s.is_deload, l.notes
       FROM workout_set_logs l
       JOIN workout_sessions s ON s.id = l.session_id
       JOIN exercise_templates e ON e.id = l.exercise_id
       LEFT JOIN workout_days d ON d.id = s.workout_day_id
       LEFT JOIN workout_programs p ON p.id = d.program_id
      WHERE s.user_id = $1
      ORDER BY s.session_date, s.created_at, l.created_at`,
    [req.userId]
  );
  const headers = ['session_date', 'program', 'day', 'exercise', 'set_type', 'set_number',
                   'weight_used', 'reps_completed', 'rpe', 'rir', 'is_deload', 'notes'];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="gradus-workouts.csv"');
  res.send(toCsv(headers, rows));
});

// Everything as JSON for backup
router.get('/all', async (req, res) => {
  const [programs, days, dayExercises, templates, sessions, sets, bodyWeight] = await Promise.all([
    query('SELECT * FROM workout_programs WHERE user_id = $1', [req.userId]),
    query(`SELECT d.* FROM workout_days d JOIN workout_programs p ON p.id = d.program_id WHERE p.user_id = $1`, [req.userId]),
    query(`SELECT de.* FROM workout_day_exercises de
             JOIN workout_days d ON d.id = de.workout_day_id
             JOIN workout_programs p ON p.id = d.program_id WHERE p.user_id = $1`, [req.userId]),
    query('SELECT * FROM exercise_templates WHERE user_id = $1', [req.userId]),
    query('SELECT * FROM workout_sessions WHERE user_id = $1', [req.userId]),
    query(`SELECT l.* FROM workout_set_logs l
             JOIN workout_sessions s ON s.id = l.session_id WHERE s.user_id = $1`, [req.userId]),
    query('SELECT * FROM body_weight_logs WHERE user_id = $1', [req.userId]),
  ]);
  res.setHeader('Content-Disposition', 'attachment; filename="gradus-export.json"');
  res.json({
    exported_at: new Date().toISOString(),
    programs: programs.rows,
    workout_days: days.rows,
    workout_day_exercises: dayExercises.rows,
    exercise_templates: templates.rows,
    sessions: sessions.rows,
    set_logs: sets.rows,
    body_weight_logs: bodyWeight.rows,
  });
});

export default router;
