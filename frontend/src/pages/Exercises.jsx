import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';

const emptyForm = {
  name: '',
  category: '',
  warmups: [{ reps: 10, percentage: 50 }],
  working_sets_count: 3,
  target_rep_min: 5,
  target_rep_max: 8,
  max_effort_count: 2,
  increment: 5,
  unit: 'lbs',
};

function templateToForm(t) {
  const m = /^last_(\d+)$/.exec(t.max_effort_sets || '');
  return {
    name: t.name,
    category: t.category || '',
    warmups: (t.warmup_sets?.sets || []).map((s) => ({ ...s })),
    working_sets_count: t.working_sets_count,
    target_rep_min: t.target_rep_min,
    target_rep_max: t.target_rep_max,
    max_effort_count: t.max_effort_sets === 'all' ? t.working_sets_count : (m ? Number(m[1]) : 1),
    increment: t.progression_rule?.amount ?? 5,
    unit: t.progression_rule?.unit ?? 'lbs',
  };
}

export default function Exercises() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(null); // null = closed
  const [editingId, setEditingId] = useState(null);
  const [previewWeight, setPreviewWeight] = useState(135);
  const [error, setError] = useState('');

  const load = () => api.get('/exercises').then(setTemplates);
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const setWarmup = (i, k, v) => {
    const warmups = form.warmups.map((w, j) => (j === i ? { ...w, [k]: Number(v) } : w));
    setForm({ ...form, warmups });
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const body = {
      name: form.name,
      category: form.category || null,
      warmup_sets: { sets: form.warmups },
      working_sets_count: Number(form.working_sets_count),
      target_rep_min: Number(form.target_rep_min),
      target_rep_max: Number(form.target_rep_max),
      max_effort_sets:
        Number(form.max_effort_count) >= Number(form.working_sets_count)
          ? 'all'
          : `last_${form.max_effort_count}`,
      progression_rule: {
        trigger: 'hits_max_reps',
        action: 'increase_weight',
        amount: Number(form.increment),
        unit: form.unit,
      },
    };
    try {
      if (editingId) await api.put(`/exercises/${editingId}`, body);
      else await api.post('/exercises', body);
      setForm(null);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this exercise template?')) return;
    await api.del(`/exercises/${id}`);
    load();
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setForm(templateToForm(t));
  };

  const round = (w) => Math.round(w / 2.5) * 2.5;
  const grouped = templates.reduce((acc, t) => {
    const key = t.is_library ? 'Library' : 'My exercises';
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exercises</h1>
        <button className="btn-primary"
                onClick={() => { setForm({ ...emptyForm }); setEditingId(null); }}>
          <Icon name="plus" className="h-4 w-4" /> New Exercise
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {editingId ? 'Edit exercise' : 'New exercise template'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" value={form.category} onChange={set('category')}
                     placeholder="Chest, Back, Legs…" />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label !mb-0">Warm-up sets</label>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                Preview at
                <input className="input !w-20 !py-1" type="number" value={previewWeight}
                       onChange={(e) => setPreviewWeight(Number(e.target.value))} />
                {form.unit}
              </div>
            </div>
            {form.warmups.map((w, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <input className="input !w-20" type="number" min="1" value={w.reps}
                       onChange={(e) => setWarmup(i, 'reps', e.target.value)} />
                <span className="text-sm text-gray-500 dark:text-gray-400">reps @</span>
                <input className="input !w-20" type="number" min="1" max="100" value={w.percentage}
                       onChange={(e) => setWarmup(i, 'percentage', e.target.value)} />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  % = <strong>{round((previewWeight * w.percentage) / 100)} {form.unit}</strong>
                </span>
                <button type="button" className="btn-danger ml-auto" aria-label="Remove warm-up set"
                        onClick={() => setForm({ ...form, warmups: form.warmups.filter((_, j) => j !== i) })}>
                  <Icon name="x-mark" className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary text-xs"
                    onClick={() => setForm({ ...form, warmups: [...form.warmups, { reps: 5, percentage: 70 }] })}>
              <Icon name="plus" className="h-3.5 w-3.5" /> Add warm-up set
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="label">Working sets</label>
              <input className="input" type="number" min="1" value={form.working_sets_count}
                     onChange={set('working_sets_count')} />
            </div>
            <div>
              <label className="label">Rep range min</label>
              <input className="input" type="number" min="1" value={form.target_rep_min}
                     onChange={set('target_rep_min')} />
            </div>
            <div>
              <label className="label">Rep range max</label>
              <input className="input" type="number" min="1" value={form.target_rep_max}
                     onChange={set('target_rep_max')} />
            </div>
            <div>
              <label className="label">Max-effort sets (last N)</label>
              <input className="input" type="number" min="1" value={form.max_effort_count}
                     onChange={set('max_effort_count')} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Weight increment on progression</label>
              <input className="input" type="number" step="0.5" value={form.increment}
                     onChange={set('increment')} />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.unit} onChange={set('unit')}>
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary">{editingId ? 'Save changes' : 'Create'}</button>
            <button type="button" className="btn-secondary"
                    onClick={() => { setForm(null); setEditingId(null); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {Object.entries(grouped).map(([group, list]) => (
        <div key={group}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {group}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((t) => (
              <div key={t.id} className="card !p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t.category || 'Uncategorized'} · {t.working_sets_count}×
                      {t.target_rep_min}–{t.target_rep_max} ·{' '}
                      +{t.progression_rule?.amount} {t.progression_rule?.unit} ·{' '}
                      {(t.warmup_sets?.sets || []).length} warm-ups
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Link to={`/exercises/${t.id}/stats`}
                          className="btn-secondary !px-2 !py-1 text-xs">
                      Stats
                    </Link>
                    {!t.is_library && (
                      <>
                        <button onClick={() => startEdit(t)}
                                className="btn-secondary !px-2 !py-1 text-xs">
                          Edit
                        </button>
                        <button onClick={() => remove(t.id)} className="btn-danger !px-2 !py-1 text-xs"
                                aria-label={`Delete ${t.name}`}>
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
