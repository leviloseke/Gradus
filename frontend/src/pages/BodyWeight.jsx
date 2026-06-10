import { useEffect, useState } from 'react';
import { api } from '../api';
import ProgressChart from '../components/ProgressChart';

export default function BodyWeight() {
  const [entries, setEntries] = useState([]);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const load = () => api.get('/body-weight').then(setEntries);
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    await api.post('/body-weight', { weight: Number(weight), log_date: date, notes });
    setWeight('');
    setNotes('');
    load();
  };

  const remove = async (id) => {
    await api.del(`/body-weight/${id}`);
    load();
  };

  const series = [...entries]
    .reverse()
    .map((e) => ({ date: e.log_date?.slice(5, 10), weight: Number(e.weight) }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Body Weight</h1>

      <form onSubmit={add} className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label className="label">Weight</label>
          <input className="input !w-28" type="number" step="0.1" value={weight}
                 onChange={(e) => setWeight(e.target.value)} required />
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={date}
                 onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex-1">
          <label className="label">Notes (optional)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button className="btn-primary">Log</button>
      </form>

      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Trend</h2>
        <ProgressChart data={series} xKey="date"
                       lines={[{ key: 'weight', name: 'Weight', color: '#3758F9' }]} />
      </div>

      <div className="card !p-0">
        <ul className="divide-y divide-gray-100 dark:divide-dark-3">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-5 py-2.5">
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-100">{Number(e.weight)}</span>
                <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">{e.log_date?.slice(0, 10)}</span>
                {e.notes && <span className="ml-3 text-sm text-gray-400 dark:text-gray-500">{e.notes}</span>}
              </div>
              <button onClick={() => remove(e.id)} className="btn-danger">✕</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
