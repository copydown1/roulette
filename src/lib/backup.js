import { newId } from './id';

const MODES = ['history', 'live'];
const BET_MODES = ['numbers', 'sectors', 'dozens', 'columns'];

const isPocket = v => Number.isInteger(v) && v >= 0 && v <= 36;
const isNumOrNull = v => v == null || Number.isFinite(v);

export function downloadSpins(spins) {
  const body = JSON.stringify({ app: 'roulette-oracle', version: 1, exported_at: new Date().toISOString(), spins }, null, 2);
  const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `roulette-oracle-spins-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Parses an exported file (or a bare array of spins). Throws with a readable message if invalid.
export function parseSpins(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('That file is not valid JSON.'); }
  const list = Array.isArray(data) ? data : data?.spins;
  if (!Array.isArray(list)) throw new Error('No spins found in that file.');

  return list.map((s, i) => {
    const ok = s && isPocket(s.number)
      && MODES.includes(s.mode)
      && BET_MODES.includes(s.betMode)
      && (s.win == null || typeof s.win === 'boolean')
      && isNumOrNull(s.net) && isNumOrNull(s.dose)
      && (s.newDealer == null || typeof s.newDealer === 'boolean')
      && (s.predicted == null || (Array.isArray(s.predicted) && s.predicted.every(isPocket)));
    if (!ok) throw new Error(`Spin #${i + 1} in that file is not valid.`);
    return {
      id: typeof s.id === 'string' ? s.id : newId(),
      number: s.number,
      win: s.win ?? null,
      net: s.net ?? null,
      dose: s.dose ?? null,
      predicted: s.predicted ?? [],
      mode: s.mode,
      betMode: s.betMode,
      created_at: typeof s.created_at === 'string' ? s.created_at : new Date().toISOString(),
      ...(s.newDealer === true && { newDealer: true }),
    };
  });
}
