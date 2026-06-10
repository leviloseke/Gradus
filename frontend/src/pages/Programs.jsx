import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/programs').then(setPrograms);
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/programs', { name, description });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this program and all its days?')) return;
    await api.del(`/programs/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Programs</h1>

      <form onSubmit={create} className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)}
                 placeholder="Push / Pull / Legs" required />
        </div>
        <div className="flex-1">
          <label className="label">Description (optional)</label>
          <input className="input" value={description}
                 onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button className="btn-primary">Add Program</button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {programs.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">No programs yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {programs.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <Link to={`/programs/${p.id}`}
                        className="text-lg font-semibold text-primary-700 dark:text-primary-400 hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {p.day_count} day{p.day_count === 1 ? '' : 's'}
                  </p>
                  {p.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{p.description}</p>
                  )}
                </div>
                <button onClick={() => remove(p.id)} className="btn-danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
