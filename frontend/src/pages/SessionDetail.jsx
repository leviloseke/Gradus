import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    api.get(`/sessions/${id}`).then(setSession);
  }, [id]);

  if (!session) return <p className="text-gray-400 dark:text-gray-500">Loading…</p>;

  const byExercise = session.sets.reduce((acc, s) => {
    (acc[s.exercise_name] = acc[s.exercise_name] || []).push(s);
    return acc;
  }, {});

  const remove = async () => {
    if (!confirm('Delete this session and all its sets?')) return;
    await api.del(`/sessions/${id}`);
    navigate('/history');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/history" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
            ← History
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {session.day_name || 'Freestyle'}{' '}
            {session.is_deload && (
              <span className="align-middle rounded bg-gray-100 dark:bg-dark-3 px-2 py-0.5 text-sm font-normal text-gray-600 dark:text-gray-300">
                Deload
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{session.session_date?.slice(0, 10)}</p>
          {session.notes && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{session.notes}</p>}
        </div>
        <div className="flex gap-2">
          {!session.completed_at && (
            <Link to={`/workout/${session.id}`} className="btn-primary">Resume</Link>
          )}
          <button onClick={remove} className="btn-danger">Delete</button>
        </div>
      </div>

      {Object.keys(byExercise).length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">No sets logged.</p>
      )}

      {Object.entries(byExercise).map(([name, sets]) => (
        <div key={name} className="card">
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">{name}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                <th className="py-1">Set</th>
                <th>Type</th>
                <th>Weight</th>
                <th>Reps</th>
                <th>RPE</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
              {sets
                .sort((a, b) =>
                  a.set_type === b.set_type
                    ? a.set_number - b.set_number
                    : a.set_type === 'warmup' ? -1 : 1
                )
                .map((s) => (
                  <tr key={s.id} className="text-gray-700 dark:text-gray-300">
                    <td className="py-1.5">{s.set_number}</td>
                    <td>{s.set_type}</td>
                    <td>{Number(s.weight_used)}</td>
                    <td>{s.reps_completed}</td>
                    <td>{s.rpe != null ? Number(s.rpe) : '—'}</td>
                    <td className="text-gray-500 dark:text-gray-400">{s.notes || ''}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
