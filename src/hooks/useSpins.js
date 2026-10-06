import { useState, useCallback, useEffect } from 'react';
import { getBetParams, computeNet } from '../lib/bankroll';
import { newId } from '../lib/id';

const LS_KEY = 'ro_spins';

function readStored() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; }
  catch { return []; }
}

function load() {
  return runRepairs(readStored());
}

function save(spins) {
  localStorage.setItem(LS_KEY, JSON.stringify(spins));
}

// One-off data repairs for bugs in earlier versions. Each runs once per browser,
// backs up the spins first, and can be deleted once it has run everywhere.
const REPAIRS = [
  {
    // Wins saved with one stake too many credited
    flag: 'ro_net_repair_v1',
    fix(spins) {
      let straightPayout = 35;
      try { straightPayout = JSON.parse(localStorage.getItem('ro_settings'))?.payout ?? 35; } catch { /* default */ }
      return spins.map(s => {
        if (s.mode !== 'live' || s.win !== true || s.dose == null) return s;
        const { n, payout } = getBetParams(s.betMode, new Set(s.predicted), straightPayout);
        return { ...s, net: computeNet(true, s.dose, n, payout) };
      });
    },
  },
  {
    // Live spins recorded as lost bets before any prediction existed
    flag: 'ro_unbet_repair_v2',
    fix(spins) {
      return spins.map(s =>
        s.mode === 'live' && s.net != null && !s.predicted?.length
          ? { ...s, win: null, net: null, dose: null }
          : s
      );
    },
  },
];

function runRepairs(spins) {
  let current = spins;
  REPAIRS.forEach(({ flag, fix }, i) => {
    if (localStorage.getItem(flag)) return;
    localStorage.setItem(`${LS_KEY}_backup_v${i + 1}`, JSON.stringify(current));
    current = fix(current);
    save(current);
    localStorage.setItem(flag, '1');
  });
  return current;
}

export function useSpins() {
  const [spins, setSpins] = useState(load);

  // Pick up spins saved by other open tabs
  useEffect(() => {
    const onStorage = e => {
      if (e.key === LS_KEY || e.key === null) setSpins(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Writes start from what's saved, not this tab's copy, so another tab's spins are never overwritten
  const addSpin = useCallback((spinData) => {
    const spin = {
      id: newId(),
      number: spinData.number,
      win:  spinData.win  ?? null,
      net:  spinData.net  ?? null,
      dose: spinData.dose ?? null,
      predicted: spinData.predicted ?? [],
      mode:    spinData.mode,
      betMode: spinData.betMode,
      created_at: new Date().toISOString(),
    };
    const next = [...readStored(), spin];
    save(next);
    setSpins(next);
    return spin;
  }, []);

  const undoLast = useCallback(() => {
    const next = readStored().slice(0, -1);
    save(next);
    setSpins(next);
  }, []);

  const resetSession = useCallback(() => {
    save([]);
    setSpins([]);
  }, []);

  const replaceSpins = useCallback((list) => {
    save(list);
    setSpins(list);
  }, []);

  return { spins, addSpin, undoLast, resetSession, replaceSpins };
}
