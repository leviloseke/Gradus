import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [bodyWeight, setBodyWeight] = useState(null);
  const [days, setDays] = useState([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.get('/programs').then(async (ps) => {
      setPrograms(ps);
      const all = await Promise.all(
        ps.map((p) => api.get(`/programs/${p.id}/days`).then(
          (ds) => ds.map((d) => ({ ...d, program_name: p.name, program_id: p.id }))
        ))
      );
      setDays(all.flat());
    });
    api.get('/sessions?limit=5').then(setRecentSessions);
    api.get('/body-weight?limit=1').then((rows) => setBodyWeight(rows[0] || null));
  }, []);

  // Suggest the day after the most recently trained one in its program
  const lastDayId = recentSessions[0]?.workout_day_id;
  let suggested = days[0];
  if (lastDayId) {
    const idx = days.findIndex((d) => d.id === lastDayId);
    if (idx >= 0) {
      const sameProgram = days.filter((d) => d.program_id === days[idx].program_id);
      const within = sameProgram.findIndex((d) => d.id === lastDayId);
      suggested = sameProgram[(within + 1) % sameProgram.length];
    }
  }

  const startWorkout = async (dayId) => {
    setStarting(true);
    try {
      const session = await api.post('/sessions', { workout_day_id: dayId });
      navigate(`/workout/${session.id}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      {suggested ? (
        <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Up next · {suggested.program_name}</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">{suggested.name}</p>
          </div>
          <button className="btn-primary" disabled={starting}
                  onClick={() => startWorkout(suggested.id)}>
            {starting ? 'Starting…' : 'Start Workout'}
          </button>
        </div>
      ) : (
        <div className="card text-center">
          <p className="mb-3 text-gray-600 dark:text-gray-300">No programs yet — set one up to get started.</p>
          <Link to="/programs" className="btn-primary">Create a Program</Link>
        </div>
      )}

      {days.length > 1 && (
        <div className="card">
          <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Start a different day</h2>
          <div className="flex flex-wrap gap-2">
            {days.map((d) => (
              <button key={d.id} onClick={() => startWorkout(d.id)} disabled={starting}
                      className="btn-secondary text-xs">
                {d.program_name}: {d.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent sessions</h2>
            <Link to="/history" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              View all
            </Link>
          </div>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Nothing logged yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-dark-3">
              {recentSessions.map((s) => (
                <li key={s.id}>
                  <Link to={`/history/${s.id}`}
                        className="flex items-center justify-between py-2 hover:bg-gray-50 dark:hover:bg-white/5">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {s.day_name || 'Freestyle'}{s.is_deload && ' · Deload'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{s.session_date?.slice(0, 10)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Body weight</h2>
            <Link to="/body-weight" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              Log / trend
            </Link>
          </div>
          {bodyWeight ? (
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {Number(bodyWeight.weight)}
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                on {bodyWeight.log_date?.slice(0, 10)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No entries yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
