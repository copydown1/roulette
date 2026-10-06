import { useEffect, useState } from 'react';
import { computePrediction, getPredictedSet, pickCount } from '../lib/prediction';

// Replays the engine on recorded spins: each spin is predicted only from the spins before it,
// exactly as the app would have shown it at each mode's current coverage. Work runs in small
// background chunks, and results are cached by spin id, so a new spin costs one prediction per mode.

export const REPLAY_MODES = ['numbers', 'sectors', 'dozens', 'columns'];
const START = 10;   // first spin the app makes a prediction for
const cache = {};   // cache['mode:coverage'][k] → spin START + k
const listFor = (m, cov) => (cache[`${m}:${cov}`] ??= []);

// Drops cached results whose spin (or anything before it) has changed, e.g. after undo/import/reset
function trim(spins) {
  for (const c of Object.values(cache)) {
    let k = 0;
    while (k < c.length && START + k < spins.length && c[k].id === spins[START + k].id) k++;
    c.length = k;
  }
}

function summary(spins, coverage) {
  const total = Math.max(0, spins.length - START);
  return Object.fromEntries(REPLAY_MODES.map(m => {
    const list = listFor(m, coverage[m]);
    return [m, {
      hits: list.reduce((s, r) => s + (r.hit ? 1 : 0), 0),
      done: list.length,
      total,
      chance: pickCount(m, coverage[m]) / 37,
      coverage: coverage[m],
    }];
  }));
}

export function useReplay(spins, firstMode, coverage) {
  const [state, setState] = useState(() => { trim(spins); return summary(spins, coverage); });

  useEffect(() => {
    trim(spins);
    setState(summary(spins, coverage));
    let cancelled = false;

    (async () => {
      const order = [firstMode, ...REPLAY_MODES.filter(m => m !== firstMode)];
      let sliceStart = performance.now();
      for (const m of order) {
        const list = listFor(m, coverage[m]);
        while (!cancelled && START + list.length < spins.length) {
          const i = START + list.length;
          const picks = getPredictedSet(computePrediction(spins.slice(0, i), m, !!spins[i].newDealer, coverage[m]));
          list.push({ id: spins[i].id, hit: picks.has(spins[i].number) });
          if (performance.now() - sliceStart > 16) {   // yield so taps and scrolling stay smooth
            setState(summary(spins, coverage));
            await new Promise(r => setTimeout(r, 0));
            sliceStart = performance.now();
          }
        }
      }
      if (!cancelled) setState(summary(spins, coverage));
    })();

    return () => { cancelled = true; };
  }, [spins, firstMode, coverage]);

  return state;
}
