import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import { CardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [session, setSession] = useState(null);

  useEffect(() => {
    api.get(`/sessions/${id}`).then(setSession).catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!session) {
    return (
      <div className="space-y-6">
        <CardSkeleton lines={1} />
        <CardSkeleton lines={4} />
      </div>
    );
  }

  const byExercise = session.sets.reduce((acc, s) => {
    (acc[s.exercise_name] = acc[s.exercise_name] || []).push(s);
    return acc;
  }, {});

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete session?',
      body: 'This session and all of its logged sets are removed permanently.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/sessions/${id}`);
      toast.success('Session deleted');
      navigate('/history');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/history" className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline">
            <Icon name="arrow-left" className="h-3.5 w-3.5" /> History
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
        <EmptyState
          icon="exercises"
          title="No sets logged"
          description={session.completed_at
            ? 'This session was finished without any logged sets.'
            : 'This session is still open — resume it to log your sets.'}
          action={!session.completed_at && (
            <Link to={`/workout/${session.id}`} className="btn-primary">Resume workout</Link>
          )}
        />
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
