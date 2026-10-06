import { useState, useCallback } from 'react';

const LS_KEY = 'ro_spins';

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; }
  catch { return []; }
}

function save(spins) {
  localStorage.setItem(LS_KEY, JSON.stringify(spins));
}

export function useSpins() {
  const [spins, setSpins] = useState(load);

  const addSpin = useCallback((spinData) => {
    const spin = {
      id: crypto.randomUUID(),
      number: spinData.number,
      win:  spinData.win  ?? null,
      net:  spinData.net  ?? null,
      dose: spinData.dose ?? null,
      predicted: spinData.predicted ?? [],
      mode:    spinData.mode,
      betMode: spinData.betMode,
      created_at: new Date().toISOString(),
    };
    setSpins(prev => {
      const next = [...prev, spin];
      save(next);
      return next;
    });
    return spin;
  }, []);

  const undoLast = useCallback(() => {
    setSpins(prev => {
      const next = prev.slice(0, -1);
      save(next);
      return next;
    });
  }, []);

  const resetSession = useCallback(() => {
    save([]);
    setSpins([]);
  }, []);

  return { spins, addSpin, undoLast, resetSession };
}
