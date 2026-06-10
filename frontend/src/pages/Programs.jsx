import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';
import { CardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function Programs() {
  const toast = useToast();
  const confirm = useConfirm();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/programs').then(setPrograms);
  useEffect(() => {
    load().catch((err) => toast.error(err.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/programs', { name, description });
      setName('');
      setDescription('');
      toast.success('Program created');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    const ok = await confirm({
      title: 'Delete program?',
      body: 'This removes the program and all of its days. Logged sessions are kept.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/programs/${id}`);
      toast.success('Program deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Programs</h1>

      <form onSubmit={create} className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="program-name">Name</label>
          <input id="program-name" className="input" value={name} onChange={(e) => setName(e.target.value)}
                 placeholder="Push / Pull / Legs" required />
        </div>
        <div className="flex-1">
          <label className="label" htmlFor="program-description">Description (optional)</label>
          <input id="program-description" className="input" value={description}
                 onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button className="btn-primary">Add Program</button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
      ) : programs.length === 0 ? (
        <EmptyState
          icon="programs"
          title="No programs yet"
          description="A program groups your workout days — create one above, then add days and exercises."
          action={
            <button className="btn-secondary" onClick={() => document.getElementById('program-name')?.focus()}>
              Name your first program
            </button>
          }
        />
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
