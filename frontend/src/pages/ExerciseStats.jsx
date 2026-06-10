import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import ProgressChart from '../components/ProgressChart';
import Icon from '../components/Icon';
import { useToast } from '../context/ToastContext';
import { CardSkeleton } from '../components/Skeleton';

export default function ExerciseStats() {
  const { id } = useParams();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get(`/exercises/${id}/stats`).then(setStats).catch((err) => toast.error(err.message));
    api.get(`/exercises/${id}/history?limit=20`).then(setHistory).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!stats) {
    return (
      <div className="space-y-6">
        <CardSkeleton lines={1} />
        <div className="grid gap-4 sm:grid-cols-3">
          <CardSkeleton lines={1} />
          <CardSkeleton lines={1} />
          <CardSkeleton lines={1} />
        </div>
        <CardSkeleton lines={4} />
      </div>
    );
  }

  const series = stats.series.map((s) => ({
    date: s.session_date?.slice(5, 10),
    top_weight: Number(s.top_weight),
    avg_reps: Number(s.avg_reps),
    est_1rm: Math.round(Number(s.est_1rm)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link to="/exercises" className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline">
          <Icon name="arrow-left" className="h-3.5 w-3.5" /> Exercises
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.exercise.name}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Personal record</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.personal_record
              ? `${Number(stats.personal_record.weight_used)} × ${stats.personal_record.reps_completed}`
              : '—'}
          </p>
          {stats.personal_record && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.personal_record.session_date?.slice(0, 10)}
            </p>
          )}
        </div>
        <div className="card text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Sessions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.series.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Est. 1RM (latest)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {series.length ? series[series.length - 1].est_1rm : '—'}
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Top working weight over time</h2>
        <ProgressChart data={series} xKey="date"
                       lines={[{ key: 'top_weight', name: 'Top weight', color: '#D97757' }]} />
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Average reps over time</h2>
        <ProgressChart data={series} xKey="date" height={200}
                       lines={[{ key: 'avg_reps', name: 'Avg reps', color: '#16a34a' }]} />
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Recent sessions</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No sets logged yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-dark-3">
            {history.map((h) => (
              <li key={h.session_id} className="py-2">
                <Link to={`/history/${h.session_id}`}
                      className="text-sm font-medium text-primary-700 dark:text-primary-400 hover:underline">
                  {h.session_date?.slice(0, 10)}{h.is_deload && ' (deload)'}
                </Link>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {h.sets
                    .filter((s) => s.set_type === 'working')
                    .map((s) => `${Number(s.weight_used)}×${s.reps_completed}`)
                    .join(', ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
