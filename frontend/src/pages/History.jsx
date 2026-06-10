import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';

function CalendarView({ sessions, month, setMonth }) {
  const byDate = useMemo(() => {
    const m = {};
    for (const s of sessions) {
      const d = s.session_date?.slice(0, 10);
      (m[d] = m[d] || []).push(s);
    }
    return m;
  }, [sessions]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const fmt = (d) =>
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <button className="btn-secondary !px-2 !py-1 text-xs" aria-label="Previous month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <Icon name="chevron-left" className="h-4 w-4" />
        </button>
        <p className="font-semibold text-gray-900 dark:text-white">
          {month.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </p>
        <button className="btn-secondary !px-2 !py-1 text-xs" aria-label="Next month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <Icon name="chevron-right" className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 dark:text-gray-500">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const daySessions = d ? byDate[fmt(d)] || [] : [];
          return (
            <div key={i}
                 className={`min-h-12 rounded-lg p-1 text-xs ${d ? 'bg-gray-50 dark:bg-white/5' : ''}`}>
              {d && <p className="text-gray-400 dark:text-gray-500">{d}</p>}
              {daySessions.map((s) => (
                <Link key={s.id} to={`/history/${s.id}`}
                      className="mt-0.5 block truncate rounded bg-primary-100 px-1 py-0.5 text-primary-800 hover:bg-primary-200 dark:bg-primary-500/20 dark:text-primary-300 dark:hover:bg-primary-500/30">
                  {s.day_name || 'Workout'}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [programFilter, setProgramFilter] = useState('');
  const [view, setView] = useState('list');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    api.get('/programs').then(setPrograms);
  }, []);

  useEffect(() => {
    const qs = programFilter ? `?program_id=${programFilter}&limit=500` : '?limit=500';
    api.get(`/sessions${qs}`).then(setSessions);
  }, [programFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">History</h1>
        <div className="flex items-center gap-2">
          <select className="input !w-auto" value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value)}>
            <option value="">All programs</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className={view === 'list' ? 'btn-primary !py-2' : 'btn-secondary !py-2'}
                  onClick={() => setView('list')}>
            List
          </button>
          <button className={view === 'calendar' ? 'btn-primary !py-2' : 'btn-secondary !py-2'}
                  onClick={() => setView('calendar')}>
            Calendar
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <CalendarView sessions={sessions} month={month} setMonth={setMonth} />
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">No sessions yet.</p>
      ) : (
        <div className="card !p-0">
          <ul className="divide-y divide-gray-100 dark:divide-dark-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link to={`/history/${s.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/5">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {s.day_name || 'Freestyle'}
                      {s.is_deload && (
                        <span className="ml-2 rounded bg-gray-100 dark:bg-dark-3 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                          Deload
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {s.program_name || '—'} · {s.set_count} sets
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{s.session_date?.slice(0, 10)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
