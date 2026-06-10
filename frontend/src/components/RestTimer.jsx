import { useEffect, useRef, useState } from 'react';

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    /* audio unavailable */
  }
}

export default function RestTimer({ seconds, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const doneRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    doneRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      if (!doneRef.current) {
        doneRef.current = true;
        beep();
        if (Notification?.permission === 'granted') {
          new Notification('Rest over — next set!');
        }
        onDone?.();
      }
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onDone]);

  const mm = String(Math.floor(Math.max(remaining, 0) / 60)).padStart(1, '0');
  const ss = String(Math.max(remaining, 0) % 60).padStart(2, '0');
  const pct = seconds > 0 ? Math.max(remaining, 0) / seconds : 0;

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-4">
      <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-white p-3 shadow-lg dark:border-primary-500/30 dark:bg-dark-2">
        <div className="text-2xl font-bold tabular-nums text-primary-700 dark:text-primary-400">
          {mm}:{ss}
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
          <div
            className="h-full bg-primary-500 transition-all"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <button
          onClick={() => setRemaining((r) => r + 30)}
          className="btn-secondary !px-2 !py-1 text-xs"
        >
          +30s
        </button>
        <button onClick={onSkip} className="btn-secondary !px-2 !py-1 text-xs">
          Skip
        </button>
      </div>
    </div>
  );
}
