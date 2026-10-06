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

const DEALER_KEY = 'ro_new_dealer_pending';
const readPending = () => localStorage.getItem(DEALER_KEY) === '1';

export function useSpins() {
  const [spins, setSpins] = useState(load);
  const [dealerPending, setDealerPending] = useState(readPending);

  const setPending = useCallback((on) => {
    if (on) localStorage.setItem(DEALER_KEY, '1');
    else localStorage.removeItem(DEALER_KEY);
    setDealerPending(on);
  }, []);

  // Pick up changes saved by other open tabs
  useEffect(() => {
    const onStorage = e => {
      if (e.key === LS_KEY || e.key === null) setSpins(readStored());
      if (e.key === DEALER_KEY || e.key === null) setDealerPending(readPending());
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
      ...(readPending() && { newDealer: true }),
    };
    const next = [...readStored(), spin];
    save(next);
    setSpins(next);
    if (spin.newDealer) setPending(false);
    return spin;
  }, [setPending]);

  const undoLast = useCallback(() => {
    const stored = readStored();
    const removed = stored.at(-1);
    const next = stored.slice(0, -1);
    save(next);
    setSpins(next);
    if (removed?.newDealer) setPending(true);
  }, [setPending]);

  const resetSession = useCallback(() => {
    save([]);
    setSpins([]);
    setPending(false);
  }, [setPending]);

  const replaceSpins = useCallback((list) => {
    save(list);
    setSpins(list);
    setPending(false);
  }, [setPending]);

  const toggleNewDealer = useCallback(() => setPending(!readPending()), [setPending]);

  // Adds past results (oldest first) as history spins
  const appendSpins = useCallback((numbers, betMode) => {
    const now = Date.now();
    const added = numbers.map((number, i) => ({
      id: newId(),
      number,
      win: null, net: null, dose: null,
      predicted: [],
      mode: 'history',
      betMode,
      created_at: new Date(now + i).toISOString(),
    }));
    const next = [...readStored(), ...added];
    save(next);
    setSpins(next);
  }, []);

  return { spins, addSpin, undoLast, resetSession, replaceSpins, appendSpins, dealerPending, toggleNewDealer };
}
