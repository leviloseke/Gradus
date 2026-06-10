import { query } from './db.js';

// Round to the nearest sensible plate jump (2.5 lbs/kg)
const roundWeight = (w) => Math.round(w / 2.5) * 2.5;

export function resolveMaxEffortIndexes(maxEffortSets, workingCount) {
  if (maxEffortSets === 'all') {
    return Array.from({ length: workingCount }, (_, i) => i + 1);
  }
  const m = /^last_(\d+)$/.exec(maxEffortSets || '');
  const n = m ? Math.min(parseInt(m[1], 10), workingCount) : 1;
  return Array.from({ length: n }, (_, i) => workingCount - n + i + 1);
}

export function calcWarmups(warmupSets, workingWeight) {
  const sets = warmupSets?.sets || [];
  return sets.map((s, i) => ({
    set_number: i + 1,
    reps: s.reps,
    percentage: s.percentage,
    weight: roundWeight((workingWeight * s.percentage) / 100),
  }));
}

// Last N non-deload sessions containing working sets for the exercise,
// newest first, each with its working-set logs.
async function recentExerciseSessions(userId, exerciseId, n = 3) {
  const sess = await query(
    `SELECT DISTINCT s.id, s.session_date, s.created_at
       FROM workout_sessions s
       JOIN workout_set_logs l ON l.session_id = s.id
      WHERE s.user_id = $1 AND l.exercise_id = $2
        AND l.set_type = 'working' AND s.is_deload = false
      ORDER BY s.session_date DESC, s.created_at DESC
      LIMIT $3`,
    [userId, exerciseId, n]
  );
  if (sess.rows.length === 0) return [];
  const logs = await query(
    `SELECT session_id, set_number, weight_used, reps_completed, rpe, rir
       FROM workout_set_logs
      WHERE session_id = ANY($1) AND exercise_id = $2 AND set_type = 'working'
      ORDER BY set_number`,
    [sess.rows.map((s) => s.id), exerciseId]
  );
  return sess.rows.map((s) => ({
    ...s,
    sets: logs.rows.filter((l) => l.session_id === s.id),
  }));
}

// Effort proxy: reps in reserve, taken from rir directly or derived from RPE.
const rirOf = (s) =>
  s.rir != null ? Number(s.rir) : s.rpe != null ? 10 - Number(s.rpe) : null;

/**
 * Suggest next-session weight/reps for an exercise — double progression at the
 * core (top of rep range on max-effort sets → add weight, reset reps), with
 * evidence-based refinements:
 *  - Effort-aware increments when RPE/RIR is logged: a comfortable top
 *    (≥3 RIR) earns a double jump; a grinding top (~0 RIR) takes a smaller
 *    ~2.5% jump, since oversized jumps are the main cause of failed
 *    progressions on heavier lifts.
 *  - Stall detection: three sessions at the same weight without a rep PR
 *    suggests a ~7.5% back-off to rebuild through the rep range.
 */
export async function suggestNext(userId, template) {
  const sessions = await recentExerciseSessions(userId, template.id, 3);

  if (sessions.length === 0) {
    return {
      suggested_weight: null,
      suggested_reps: template.target_rep_min,
      action: 'start',
      stalled: false,
      triggered: false,
      reason: 'No history yet — enter a starting working weight.',
    };
  }

  const maxEffortIdx = resolveMaxEffortIndexes(
    template.max_effort_sets,
    template.working_sets_count
  );
  // Progression is judged on the max-effort sets when present
  const considered = (sets) => {
    const me = sets.filter((s) => maxEffortIdx.includes(s.set_number));
    return me.length > 0 ? me : sets;
  };

  const last = sessions[0];
  const lastSets = considered(last.sets);
  const lastWeight = Math.max(...last.sets.map((r) => Number(r.weight_used)));
  const rule = template.progression_rule || {};
  const unit = rule.unit || 'lbs';
  const increment = Number(rule.amount ?? 5);

  const rirs = lastSets.map(rirOf).filter((v) => v != null);
  const avgRir = rirs.length
    ? rirs.reduce((a, b) => a + b, 0) / rirs.length
    : null;

  const hitTop = lastSets.every(
    (r) => r.reps_completed >= template.target_rep_max
  );

  if (hitTop) {
    let inc = increment;
    let note = '';
    if (avgRir != null && avgRir >= 3) {
      // Plenty in the tank — research shows hypertrophy stimulus flattens
      // past ~2 RIR, so this weight is no longer doing much. Jump harder.
      inc = increment * 2;
      note = ` You had ≈${Math.round(avgRir)} reps in reserve, so take a double jump to get back into a productive effort range (1–3 RIR).`;
    } else if (avgRir != null && avgRir <= 0.5) {
      // Barely made it — if a full increment exceeds ~2.5% it's likely to
      // stall; round the jump down to the nearest plate-able 2.5% instead.
      const micro = Math.max(Math.floor((lastWeight * 0.025) / 2.5) * 2.5, 2.5);
      if (micro < increment) {
        inc = micro;
        note = ` That was a grind (≈0 reps in reserve) — take a smaller ~2.5% jump (${inc} ${unit}) to keep the streak going.`;
      }
    }
    return {
      suggested_weight: roundWeight(lastWeight + inc),
      suggested_reps: template.target_rep_min,
      action: 'increase',
      stalled: false,
      triggered: true,
      reason: `Hit ${template.target_rep_max} reps on max-effort sets — increase to ${roundWeight(lastWeight + inc)} ${unit} and reset to ${template.target_rep_min} reps.${note}`,
    };
  }

  // Stall check: 3 straight sessions at this weight without a rep PR
  const totalReps = (s) =>
    considered(s.sets).reduce((a, b) => a + b.reps_completed, 0);
  const sameWeight = sessions.filter(
    (s) => Math.max(...s.sets.map((x) => Number(x.weight_used))) === lastWeight
  );
  const stalled =
    sameWeight.length >= 3 &&
    totalReps(sameWeight[0]) <= totalReps(sameWeight[1]) &&
    totalReps(sameWeight[0]) <= totalReps(sameWeight[2]);

  if (stalled) {
    const backoff = roundWeight(lastWeight * 0.925);
    return {
      suggested_weight: backoff,
      suggested_reps: template.target_rep_max,
      action: 'backoff',
      stalled: true,
      triggered: false,
      reason: `Three sessions at ${lastWeight} ${unit} without a rep PR — back off ~7.5% to ${backoff} and rebuild through the rep range. Slightly easier sets (1–3 reps in reserve) grow muscle just as well and break the plateau.`,
    };
  }

  const minReps = Math.min(...lastSets.map((r) => r.reps_completed));
  const nextReps = Math.min(minReps + 1, template.target_rep_max);
  let reason = `Keep ${lastWeight} ${unit} and aim for ${nextReps} reps on max-effort sets.`;
  if (avgRir != null && avgRir >= 3) {
    reason += ` Last session was comfortable (≈${Math.round(avgRir)} reps in reserve) — push the max-effort sets closer to 1–2 reps in reserve.`;
  }
  return {
    suggested_weight: lastWeight,
    suggested_reps: nextReps,
    action: 'hold',
    stalled: false,
    triggered: false,
    reason,
  };
}

/**
 * Recommend (never force) a deload: coach-consensus research suggests a
 * lighter week roughly every 4–6 weeks of hard training. Triggered after
 * 5+ weeks AND 12+ non-deload sessions since the last deload (or ever).
 */
export async function deloadHint(userId) {
  const { rows } = await query(
    `SELECT
       (SELECT max(session_date) FROM workout_sessions
         WHERE user_id = $1 AND is_deload = true) AS last_deload,
       (SELECT min(session_date) FROM workout_sessions
         WHERE user_id = $1) AS first_session,
       (SELECT count(*) FROM workout_sessions
         WHERE user_id = $1 AND is_deload = false
           AND session_date > COALESCE(
             (SELECT max(session_date) FROM workout_sessions
               WHERE user_id = $1 AND is_deload = true),
             '0001-01-01'::date))::int AS hard_sessions`,
    [userId]
  );
  const { last_deload, first_session, hard_sessions } = rows[0];
  const anchor = last_deload || first_session;
  if (!anchor) return { recommended: false };
  const weeks = Math.floor(
    (Date.now() - new Date(anchor).getTime()) / (7 * 86400000)
  );
  if (weeks >= 5 && hard_sessions >= 12) {
    return {
      recommended: true,
      weeks_since: weeks,
      hard_sessions,
      reason: `${weeks} weeks and ${hard_sessions} hard sessions since your last deload — evidence supports a lighter week every 4–6 weeks to shed fatigue and keep progressing.`,
    };
  }
  return { recommended: false, weeks_since: weeks, hard_sessions };
}
