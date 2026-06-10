import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import RestTimer from '../components/RestTimer';
import ProgressionBanner from '../components/ProgressionBanner';
import Icon from '../components/Icon';

const round = (w) => Math.round(w / 2.5) * 2.5;

function SetRow({ planned, logged, isMaxEffort, onLog, onUpdate, unit }) {
  const [weight, setWeight] = useState(planned.weight ?? '');
  const [reps, setReps] = useState(planned.reps ?? '');
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState('');
  const [showExtra, setShowExtra] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (planned.weight != null && weight === '') setWeight(planned.weight);
    if (planned.reps != null && reps === '') setReps(planned.reps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planned.weight, planned.reps]);

  const submit = async () => {
    if (weight === '' || reps === '') return;
    setBusy(true);
    try {
      const body = {
        weight_used: Number(weight),
        reps_completed: Number(reps),
        rpe: rpe === '' ? null : Number(rpe),
        notes: notes || null,
      };
      if (logged) await onUpdate(logged.id, body);
      else await onLog(body);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`rounded-lg border p-2 ${
        logged
          ? 'border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10'
          : isMaxEffort
            ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
            : 'border-gray-200 bg-white dark:border-dark-3 dark:bg-dark-3/40'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
          {planned.set_type === 'warmup' ? `W${planned.set_number}` : `Set ${planned.set_number}`}
          {isMaxEffort && (
            <span className="ml-1 inline-flex align-text-bottom text-amber-600 dark:text-amber-400" title="Max effort" aria-label="Max effort">
              <Icon name="star" solid className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
        <input className="input !w-20 !px-2 text-center" type="number" step="2.5" inputMode="decimal"
               value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={unit} />
        <span className="text-xs text-gray-400 dark:text-gray-500">×</span>
        <input className="input !w-16 !px-2 text-center" type="number" inputMode="numeric"
               value={reps} onChange={(e) => setReps(e.target.value)} placeholder="reps" />
        <button onClick={submit} disabled={busy || weight === '' || reps === ''}
                className={logged ? 'btn-secondary !px-3 !py-1.5 text-xs' : 'btn-primary !px-3 !py-1.5 text-xs'}>
          {logged ? 'Update' : 'Log'}
        </button>
        <button onClick={() => setShowExtra(!showExtra)}
                className="ml-auto inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          <Icon name={showExtra ? 'minus' : 'plus'} className="h-3 w-3" /> RPE/notes
        </button>
      </div>
      {showExtra && (
        <div className="mt-2 flex items-center gap-2">
          <input className="input !w-20 !px-2 text-center" type="number" step="0.5" min="1" max="10"
                 value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="RPE" />
          <input className="input flex-1 !px-2" value={notes}
                 onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
        </div>
      )}
    </div>
  );
}

export default function WorkoutSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loggedSets, setLoggedSets] = useState([]);
  const [setsLoaded, setSetsLoaded] = useState(false);
  const [workingWeights, setWorkingWeights] = useState({}); // exerciseId -> weight
  const [timer, setTimer] = useState(null); // rest_seconds or null
  const [isDeload, setIsDeload] = useState(false);
  const [current, setCurrent] = useState(0);
  const jumpedToIncomplete = useRef(false);

  useEffect(() => {
    api.get(`/sessions/${sessionId}/plan`).then((p) => {
      setPlan(p);
      setIsDeload(p.session.is_deload);
      const ww = {};
      for (const e of p.exercises) {
        if (e.suggestion.suggested_weight != null) ww[e.id] = e.suggestion.suggested_weight;
      }
      setWorkingWeights(ww);
    });
    api.get(`/sessions/${sessionId}`).then((s) => {
      setLoggedSets(s.sets || []);
      setSetsLoaded(true);
    });
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [sessionId]);

  const exercises = useMemo(() => plan?.exercises || [], [plan]);

  const workingDone = (e) =>
    loggedSets.filter((l) => l.exercise_id === e.id && l.set_type === 'working').length;
  const isComplete = (e) => workingDone(e) >= e.working_sets_count;

  // When resuming a session, jump straight to the first unfinished exercise.
  useEffect(() => {
    if (jumpedToIncomplete.current || !plan || !setsLoaded || exercises.length === 0) return;
    jumpedToIncomplete.current = true;
    const idx = exercises.findIndex((e) => !isComplete(e));
    if (idx > 0) setCurrent(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, setsLoaded]);

  const findLogged = (exerciseId, setType, setNumber) =>
    loggedSets.find(
      (l) => l.exercise_id === exerciseId && l.set_type === setType && l.set_number === setNumber
    );

  const logSet = async (exercise, setType, setNumber, body) => {
    const created = await api.post(`/sessions/${sessionId}/sets`, {
      exercise_id: exercise.id,
      set_number: setNumber,
      set_type: setType,
      ...body,
    });
    setLoggedSets((prev) => [...prev, created]);
    if (setType === 'working') setTimer({ seconds: exercise.rest_seconds, key: Date.now() });
  };

  const updateSet = async (setId, body) => {
    const updated = await api.put(`/sessions/${sessionId}/sets/${setId}`, body);
    setLoggedSets((prev) => prev.map((l) => (l.id === setId ? updated : l)));
  };

  const toggleDeload = async () => {
    const next = !isDeload;
    setIsDeload(next);
    await api.put(`/sessions/${sessionId}`, { is_deload: next });
  };

  const finish = async () => {
    await api.put(`/sessions/${sessionId}`, { completed: true });
    navigate(`/history/${sessionId}`);
  };

  const deloadFactor = isDeload ? 0.9 : 1;

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stroke border-t-primary dark:border-dark-3 dark:border-t-primary-400" />
      </div>
    );
  }

  const totalWorking = exercises.reduce((n, e) => n + e.working_sets_count, 0);
  const doneWorking = loggedSets.filter((l) => l.set_type === 'working').length;
  const progressPct = totalWorking ? Math.min(doneWorking / totalWorking, 1) * 100 : 0;

  const ex = exercises[current];
  const last = current === exercises.length - 1;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Workout-mode top bar */}
      <header className="sticky top-0 z-20 border-b border-stroke bg-white/80 backdrop-blur-lg dark:border-dark-3 dark:bg-dark/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            title="Leave workout (progress is saved)"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-2 dark:hover:text-white"
          >
            <Icon name="chevron-left" className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">Workout</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {plan.session.session_date?.slice(0, 10)} · {doneWorking}/{totalWorking} sets
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggleDeload}
              title="Deload: −10% weight, no progression"
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isDeload
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                  : 'border-stroke text-gray-500 hover:text-gray-900 dark:border-dark-3 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Deload
            </button>
            <button onClick={finish} className="btn-primary !px-4 !py-1.5 text-xs">
              Finish
            </button>
          </div>
        </div>
        {/* Session progress */}
        <div className="h-1 w-full bg-gray-100 dark:bg-dark-2">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-32">
        {plan.deload_hint?.recommended && !isDeload && (
          <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2">
              <Icon name="moon" className="h-4 w-4 shrink-0" />
              {plan.deload_hint.reason}
            </p>
            <button
              onClick={toggleDeload}
              className="shrink-0 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/20"
            >
              Make this a deload
            </button>
          </div>
        )}
        {exercises.length === 0 ? (
          <div className="card text-center">
            <p className="text-gray-500 dark:text-gray-400">
              This session has no planned day — log sets from a program day next time.
            </p>
            <button onClick={() => navigate('/')} className="btn-secondary mt-4">
              Back to dashboard
            </button>
          </div>
        ) : (
          (() => {
            const ww = workingWeights[ex.id];
            const effective = ww != null ? round(ww * deloadFactor) : null;
            const warmups = (ex.warmup_sets?.sets || []).map((w, i) => ({
              set_type: 'warmup',
              set_number: i + 1,
              reps: w.reps,
              weight: effective != null ? round((effective * w.percentage) / 100) : null,
              percentage: w.percentage,
            }));
            return (
              <div key={ex.id} className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
                  Exercise {current + 1} of {exercises.length}
                </p>

                <div className="card space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ex.name}</h1>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Target {ex.target_rep_min}–{ex.target_rep_max} reps · rest {ex.rest_seconds}s
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      Working weight
                      <input className="input !w-24 !px-2 text-center" type="number" step="2.5"
                             inputMode="decimal" value={ww ?? ''}
                             placeholder="?"
                             onChange={(e) =>
                               setWorkingWeights({
                                 ...workingWeights,
                                 [ex.id]: e.target.value === '' ? null : Number(e.target.value),
                               })
                             } />
                    </div>
                  </div>

                  {!isDeload && <ProgressionBanner suggestion={ex.suggestion} />}
                  {isDeload && ww != null && (
                    <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-dark-3 dark:text-gray-300">
                      Deload: working weight reduced to ~{effective}.
                    </p>
                  )}

                  {warmups.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Warm-up
                      </p>
                      {warmups.map((w) => (
                        <SetRow
                          key={`w${w.set_number}`}
                          planned={w}
                          logged={findLogged(ex.id, 'warmup', w.set_number)}
                          isMaxEffort={false}
                          unit={ex.progression_rule?.unit || 'lbs'}
                          onLog={(body) => logSet({ ...ex, rest_seconds: 60 }, 'warmup', w.set_number, body)}
                          onUpdate={updateSet}
                        />
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Working sets
                    </p>
                    {Array.from({ length: ex.working_sets_count }, (_, i) => i + 1).map((n) => (
                      <SetRow
                        key={`s${n}`}
                        planned={{
                          set_type: 'working',
                          set_number: n,
                          weight: effective,
                          reps: ex.suggestion.suggested_reps,
                        }}
                        logged={findLogged(ex.id, 'working', n)}
                        isMaxEffort={ex.max_effort_set_numbers.includes(n)}
                        unit={ex.progression_rule?.unit || 'lbs'}
                        onLog={(body) => logSet(ex, 'working', n, body)}
                        onUpdate={updateSet}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </main>

      {/* Exercise navigation */}
      {exercises.length > 0 && (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-stroke bg-white/90 backdrop-blur-lg dark:border-dark-3 dark:bg-dark/90">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <button
              onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
              disabled={current === 0}
              className="btn-secondary !px-4"
            >
              <Icon name="chevron-left" className="h-4 w-4" /> Prev
            </button>
            <div className="flex items-center gap-2">
              {exercises.map((e, i) => (
                <button
                  key={e.id}
                  onClick={() => setCurrent(i)}
                  title={e.name}
                  className={`h-2.5 rounded-full transition-all ${
                    i === current
                      ? 'w-6 bg-primary'
                      : isComplete(e)
                        ? 'w-2.5 bg-green-500'
                        : 'w-2.5 bg-gray-300 dark:bg-dark-3'
                  }`}
                />
              ))}
            </div>
            {last ? (
              <button onClick={finish} className="btn-primary !px-4">
                Finish <Icon name="check" className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setCurrent((c) => Math.min(c + 1, exercises.length - 1))}
                className="btn-primary !px-4"
              >
                Next <Icon name="chevron-right" className="h-4 w-4" />
              </button>
            )}
          </div>
        </footer>
      )}

      {timer && (
        <RestTimer
          key={timer.key}
          seconds={timer.seconds}
          onSkip={() => setTimer(null)}
          onDone={() => setTimeout(() => setTimer(null), 3000)}
        />
      )}
    </div>
  );
}
