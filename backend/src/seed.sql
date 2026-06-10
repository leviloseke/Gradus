-- Default exercise library (user_id NULL = visible to everyone, read-only)
INSERT INTO exercise_templates (user_id, name, category, warmup_sets, working_sets_count, target_rep_min, target_rep_max, max_effort_sets, progression_rule)
SELECT NULL, v.name, v.category, v.warmup_sets::jsonb, v.working_sets_count, 5, 8, 'last_2',
       json_build_object('trigger', 'hits_max_reps', 'action', 'increase_weight', 'amount', v.increment, 'unit', 'lbs')::jsonb
FROM (VALUES
  ('Barbell Bench Press',      'Chest',     '{"sets":[{"reps":10,"percentage":50},{"reps":5,"percentage":70},{"reps":3,"percentage":85}]}', 3, 5),
  ('Incline Dumbbell Press',   'Chest',     '{"sets":[{"reps":10,"percentage":50},{"reps":5,"percentage":75}]}',                            3, 5),
  ('Overhead Press',           'Shoulders', '{"sets":[{"reps":10,"percentage":50},{"reps":5,"percentage":70},{"reps":3,"percentage":85}]}', 3, 5),
  ('Lateral Raise',            'Shoulders', '{"sets":[{"reps":12,"percentage":50}]}',                                                       3, 5),
  ('Barbell Squat',            'Legs',      '{"sets":[{"reps":10,"percentage":40},{"reps":5,"percentage":60},{"reps":3,"percentage":80}]}', 3, 10),
  ('Romanian Deadlift',        'Legs',      '{"sets":[{"reps":8,"percentage":50},{"reps":5,"percentage":75}]}',                             3, 10),
  ('Leg Press',                'Legs',      '{"sets":[{"reps":10,"percentage":50},{"reps":6,"percentage":75}]}',                            3, 10),
  ('Deadlift',                 'Back',      '{"sets":[{"reps":8,"percentage":40},{"reps":5,"percentage":60},{"reps":2,"percentage":80}]}',  2, 10),
  ('Barbell Row',              'Back',      '{"sets":[{"reps":10,"percentage":50},{"reps":5,"percentage":75}]}',                            3, 5),
  ('Lat Pulldown',             'Back',      '{"sets":[{"reps":10,"percentage":50}]}',                                                       3, 5),
  ('Pull-Up',                  'Back',      '{"sets":[]}',                                                                                  3, 5),
  ('Barbell Curl',             'Arms',      '{"sets":[{"reps":12,"percentage":50}]}',                                                       3, 5),
  ('Triceps Pushdown',         'Arms',      '{"sets":[{"reps":12,"percentage":50}]}',                                                       3, 5),
  ('Dumbbell Hammer Curl',     'Arms',      '{"sets":[{"reps":12,"percentage":50}]}',                                                       3, 5),
  ('Calf Raise',               'Legs',      '{"sets":[{"reps":15,"percentage":50}]}',                                                       3, 10)
) AS v(name, category, warmup_sets, working_sets_count, increment)
WHERE NOT EXISTS (
  SELECT 1 FROM exercise_templates e WHERE e.user_id IS NULL AND e.name = v.name
);
