import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import { CardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function ProgramDetail() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [program, setProgram] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [dayName, setDayName] = useState('');
  const [adding, setAdding] = useState(null); // dayId currently adding an exercise to
  const [pick, setPick] = useState({ exercise_template_id: '', rest_seconds: 120 });

  const load = useCallback(() => api.get(`/programs/${id}`).then(setProgram), [id]);

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
    api.get('/exercises').then(setTemplates).catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (!program) {
    return (
      <div className="space-y-6">
        <CardSkeleton lines={1} />
        <CardSkeleton lines={3} />
      </div>
    );
  }

  const addDay = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/programs/${id}/days`, { name: dayName });
      setDayName('');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeDay = async (dayId, name) => {
    const ok = await confirm({
      title: `Delete ${name}?`,
      body: 'The day and its exercise list are removed. Logged sessions are kept.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/programs/${id}/days/${dayId}`);
      toast.success('Day deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const sortedDays = [...program.days].sort((a, b) => a.order - b.order);

  const moveDay = async (day, dir) => {
    const idx = sortedDays.findIndex((d) => d.id === day.id);
    const swap = sortedDays[idx + dir];
    if (!swap) return;
    try {
      await Promise.all([
        api.put(`/programs/${id}/days/${day.id}`, { order: swap.order }),
        api.put(`/programs/${id}/days/${swap.id}`, { order: day.order }),
      ]);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addExercise = async (e, dayId) => {
    e.preventDefault();
    try {
      await api.post(`/programs/${id}/days/${dayId}/exercises`, {
        exercise_template_id: pick.exercise_template_id,
        rest_seconds: Number(pick.rest_seconds) || 120,
      });
      setAdding(null);
      setPick({ exercise_template_id: '', rest_seconds: 120 });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeExercise = async (dayId, dayExerciseId) => {
    try {
      await api.del(`/programs/${id}/days/${dayId}/exercises/${dayExerciseId}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/programs" className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline">
          <Icon name="arrow-left" className="h-3.5 w-3.5" /> Programs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{program.name}</h1>
        {program.description && <p className="text-gray-600 dark:text-gray-300">{program.description}</p>}
      </div>

      <form onSubmit={addDay} className="card flex items-end gap-3">
        <div className="flex-1">
          <label className="label" htmlFor="day-name">New workout day</label>
          <input id="day-name" className="input" value={dayName} placeholder="Push Day"
                 onChange={(e) => setDayName(e.target.value)} required />
        </div>
        <button className="btn-primary">Add Day</button>
      </form>

      {sortedDays.length === 0 && (
        <EmptyState
          icon="history"
          title="No workout days yet"
          description="Add a day above (like Push Day or Leg Day), then assign exercises to it."
        />
      )}

      {sortedDays.map((day, i) => (
        <div key={day.id} className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <span className="mr-2 text-sm font-normal text-gray-400 dark:text-gray-500">#{i + 1}</span>
              {day.name}
            </h2>
            <div className="flex gap-2">
              <button onClick={() => moveDay(day, -1)} disabled={i === 0}
                      className="btn-secondary !px-2 !py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Move day up">
                <Icon name="chevron-up" className="h-4 w-4" />
              </button>
              <button onClick={() => moveDay(day, 1)} disabled={i === sortedDays.length - 1}
                      className="btn-secondary !px-2 !py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Move day down">
                <Icon name="chevron-down" className="h-4 w-4" />
              </button>
              <button onClick={() => removeDay(day.id, day.name)} className="btn-danger">Delete</button>
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
                <label className="label" htmlFor={`pick-exercise-${day.id}`}>Exercise</label>
                <select id={`pick-exercise-${day.id}`} className="input" required value={pick.exercise_template_id}
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
                <label className="label" htmlFor={`pick-rest-${day.id}`}>Rest (s)</label>
                <input id={`pick-rest-${day.id}`} className="input w-24" type="number" min="0" value={pick.rest_seconds}
                       onChange={(e) => setPick({ ...pick, rest_seconds: e.target.value })} />
              </div>
              <button className="btn-primary">Add</button>
              <button type="button" onClick={() => setAdding(null)} className="btn-secondary">
                Cancel
              </button>
            </form>
          ) : (
            <button onClick={() => setAdding(day.id)} className="btn-secondary">
              <Icon name="plus" className="h-4 w-4" /> Add exercise
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
