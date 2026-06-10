import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

export default function ProgramDetail() {
  const { id } = useParams();
  const [program, setProgram] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [dayName, setDayName] = useState('');
  const [adding, setAdding] = useState(null); // dayId currently adding an exercise to
  const [pick, setPick] = useState({ exercise_template_id: '', rest_seconds: 120 });

  const load = useCallback(() => api.get(`/programs/${id}`).then(setProgram), [id]);

  useEffect(() => {
    load();
    api.get('/exercises').then(setTemplates);
  }, [load]);

  if (!program) return <p className="text-gray-400 dark:text-gray-500">Loading…</p>;

  const addDay = async (e) => {
    e.preventDefault();
    await api.post(`/programs/${id}/days`, { name: dayName });
    setDayName('');
    load();
  };

  const removeDay = async (dayId) => {
    if (!confirm('Delete this day?')) return;
    await api.del(`/programs/${id}/days/${dayId}`);
    load();
  };

  const moveDay = async (day, dir) => {
    const sorted = [...program.days].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((d) => d.id === day.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      api.put(`/programs/${id}/days/${day.id}`, { order: swap.order }),
      api.put(`/programs/${id}/days/${swap.id}`, { order: day.order }),
    ]);
    load();
  };

  const addExercise = async (e, dayId) => {
    e.preventDefault();
    await api.post(`/programs/${id}/days/${dayId}/exercises`, {
      exercise_template_id: pick.exercise_template_id,
      rest_seconds: Number(pick.rest_seconds) || 120,
    });
    setAdding(null);
    setPick({ exercise_template_id: '', rest_seconds: 120 });
    load();
  };

  const removeExercise = async (dayId, dayExerciseId) => {
    await api.del(`/programs/${id}/days/${dayId}/exercises/${dayExerciseId}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/programs" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
          ← Programs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{program.name}</h1>
        {program.description && <p className="text-gray-600 dark:text-gray-300">{program.description}</p>}
      </div>

      <form onSubmit={addDay} className="card flex items-end gap-3">
        <div className="flex-1">
          <label className="label">New workout day</label>
          <input className="input" value={dayName} placeholder="Push Day"
                 onChange={(e) => setDayName(e.target.value)} required />
        </div>
        <button className="btn-primary">Add Day</button>
      </form>

      {program.days.map((day, i) => (
        <div key={day.id} className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <span className="mr-2 text-sm font-normal text-gray-400 dark:text-gray-500">#{i + 1}</span>
              {day.name}
            </h2>
            <div className="flex gap-2">
              <button onClick={() => moveDay(day, -1)} className="btn-secondary !px-2 !py-1 text-xs">↑</button>
              <button onClick={() => moveDay(day, 1)} className="btn-secondary !px-2 !py-1 text-xs">↓</button>
              <button onClick={() => removeDay(day.id)} className="btn-danger">Delete</button>
            </div>
          </div>

          {day.exercises.length === 0 ? (
            <p className="mb-3 text-sm text-gray-400 dark:text-gray-500">No exercises yet.</p>
          ) : (
            <ul className="mb-3 divide-y divide-gray-100 dark:divide-dark-3">
              {day.exercises.map((de) => (
                <li key={de.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">{de.exercise.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {de.exercise.working_sets_count} working sets ·{' '}
                      {de.exercise.target_rep_min}–{de.exercise.target_rep_max} reps ·{' '}
                      rest {de.rest_seconds}s
                    </p>
                  </div>
                  <button onClick={() => removeExercise(day.id, de.id)} className="btn-danger">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {adding === day.id ? (
            <form onSubmit={(e) => addExercise(e, day.id)}
                  className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="label">Exercise</label>
                <select className="input" required value={pick.exercise_template_id}
                        onChange={(e) => setPick({ ...pick, exercise_template_id: e.target.value })}>
                  <option value="">Choose…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.is_library ? ' (library)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Rest (s)</label>
                <input className="input w-24" type="number" min="0" value={pick.rest_seconds}
                       onChange={(e) => setPick({ ...pick, rest_seconds: e.target.value })} />
              </div>
              <button className="btn-primary">Add</button>
              <button type="button" onClick={() => setAdding(null)} className="btn-secondary">
                Cancel
              </button>
            </form>
          ) : (
            <button onClick={() => setAdding(day.id)} className="btn-secondary">
              + Add exercise
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
