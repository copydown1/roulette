// ─── Constants ───────────────────────────────────────────────────────────────

export const WHEEL = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,
  5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26,
];

export const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

// Wheel position index for each pocket number
const WHEEL_POS = {};
WHEEL.forEach((n, i) => { WHEEL_POS[n] = i; });

export const DOZENS = [
  { label: '1st 12', numbers: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { label: '2nd 12', numbers: [13,14,15,16,17,18,19,20,21,22,23,24] },
  { label: '3rd 12', numbers: [25,26,27,28,29,30,31,32,33,34,35,36] },
];

export const COLUMNS = [
  { label: 'COL 3', numbers: [3,6,9,12,15,18,21,24,27,30,33,36] },
  { label: 'COL 2', numbers: [2,5,8,11,14,17,20,23,26,29,32,35] },
  { label: 'COL 1', numbers: [1,4,7,10,13,16,19,22,25,28,31,34] },
];

const SIGNAL_NAMES = ['hot','bias','due','sector','memory','repeat','streak','signature'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeScores() { return new Array(37).fill(0); }

export function getColor(n) {
  if (n === 0) return 'green';
  return RED.has(n) ? 'red' : 'black';
}

// ─── 8 Signals ───────────────────────────────────────────────────────────────

function signalHot(spins) {
  const scores = makeScores();
  const recents = spins.slice(-36);
  const len = recents.length;
  if (!len) return scores;
  recents.forEach((s, i) => {
    const weight = 1 + (i / len) * 2;
    scores[s.number] += weight;
  });
  return scores;
}

function signalBias(spins) {
  const scores = makeScores();
  spins.slice(-100).forEach(s => { scores[s.number] += 0.35; });
  return scores;
}

function signalDue(spins) {
  const scores = makeScores();
  const len = spins.length;
  if (!len) return scores;
  const lastSeen = new Array(37).fill(-1);
  for (let i = 0; i < len; i++) lastSeen[spins[i].number] = i;
  for (let n = 0; n <= 36; n++) {
    const gap = len - 1 - lastSeen[n];
    if (gap > 18) scores[n] += Math.min((gap - 18) / 18, 1) * 0.8;
  }
  return scores;
}

function signalSector(spins) {
  const scores = makeScores();
  spins.slice(-20).forEach(s => {
    const pos = WHEEL_POS[s.number];
    for (let d = 1; d <= 3; d++) {
      scores[WHEEL[(pos - d + 37) % 37]] += 0.6 / d;
      scores[WHEEL[(pos + d) % 37]] += 0.6 / d;
    }
  });
  return scores;
}

function signalMemory(spins) {
  const scores = makeScores();
  if (spins.length < 2) return scores;
  const lastNum = spins[spins.length - 1].number;
  const total = spins.length;
  for (let i = 0; i < total - 1; i++) {
    if (spins[i].number === lastNum) {
      scores[spins[i + 1].number] += 0.9 * (i / total);
    }
  }
  return scores;
}

function signalRepeat(spins) {
  const scores = makeScores();
  if (spins.length < 2) return scores;
  let repeats = 0;
  for (let i = 1; i < spins.length; i++) {
    if (spins[i].number === spins[i - 1].number) repeats++;
  }
  const repeatRate = repeats / (spins.length - 1);
  const blind = 1 / 37;
  if (repeatRate > blind) {
    scores[spins[spins.length - 1].number] += (repeatRate - blind) * 20;
  }
  return scores;
}

function signalStreak(spins) {
  const scores = makeScores();
  if (spins.length < 2) return scores;

  function getProps(n) {
    if (n === 0) return { color: null, parity: null, range: null };
    return {
      color: RED.has(n) ? 'red' : 'black',
      parity: n % 2 === 0 ? 'even' : 'odd',
      range: n <= 18 ? 'low' : 'high',
    };
  }

  const lastProps = getProps(spins[spins.length - 1].number);

  for (const prop of ['color', 'parity', 'range']) {
    const lastVal = lastProps[prop];
    if (!lastVal) continue;

    let runLength = 1;
    for (let i = spins.length - 2; i >= 0; i--) {
      if (getProps(spins[i].number)[prop] === lastVal) runLength++;
      else break;
    }

    if (runLength >= 2) {
      const boost = 0.25 * Math.min(runLength, 6);
      for (let n = 1; n <= 36; n++) {
        if (getProps(n)[prop] === lastVal) scores[n] += boost;
      }
    }
  }
  return scores;
}

function signalSignature(spins) {
  const scores = makeScores();
  const recent = spins.slice(-16);
  if (recent.length < 4) return scores;

  const angles = recent.map(s => (2 * Math.PI * WHEEL_POS[s.number]) / 37);
  const sumSin = angles.reduce((s, a) => s + Math.sin(a), 0);
  const sumCos = angles.reduce((s, a) => s + Math.cos(a), 0);
  const conc = Math.sqrt(sumSin * sumSin + sumCos * sumCos) / recent.length;

  if (conc <= 0.15) return scores;

  const meanAngle = Math.atan2(sumSin, sumCos);

  for (let n = 0; n <= 36; n++) {
    const pa = (2 * Math.PI * WHEEL_POS[n]) / 37;
    let d = Math.abs(pa - meanAngle);
    if (d > Math.PI) d = 2 * Math.PI - d;
    scores[n] += conc * 1.2 * Math.exp(-(d * d) / (2 * 0.35 * 0.35));
  }
  return scores;
}

const SIGNALS = [signalHot, signalBias, signalDue, signalSector, signalMemory, signalRepeat, signalStreak, signalSignature];

// ─── Self-tuning weights ──────────────────────────────────────────────────────

function getTopNForMode(signalScores, betMode) {
  switch (betMode) {
    case 'numbers': {
      return [...signalScores]
        .map((s, n) => ({ n, s }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 5)
        .map(x => x.n);
    }
    case 'sectors': {
      const windows = buildSectorWindows(signalScores);
      const selected = greedyTopWindows(windows, 3);
      return selected.flatMap(w => w.pockets);
    }
    case 'dozens': {
      const best = DOZENS.map(d => ({
        numbers: d.numbers,
        score: d.numbers.reduce((s, n) => s + signalScores[n], 0),
      })).sort((a, b) => b.score - a.score)[0];
      return best.numbers;
    }
    case 'columns': {
      const best = COLUMNS.map(c => ({
        numbers: c.numbers,
        score: c.numbers.reduce((s, n) => s + signalScores[n], 0),
      })).sort((a, b) => b.score - a.score)[0];
      return best.numbers;
    }
    default: return [];
  }
}

export function computeWeights(spins, betMode) {
  if (spins.length < 25) {
    return SIGNAL_NAMES.map(name => ({ name, hitRate: 0, baseline: 0, weight: 1 }));
  }

  const backtest = spins.slice(-150);
  const halfLife = 60;
  const startFrom = Math.min(25, backtest.length - 1);

  const nPicks = betMode === 'numbers' ? 5 : betMode === 'sectors' ? 15 : 12;
  const baseline = nPicks / 37;

  return SIGNALS.map((signal, si) => {
    let wHits = 0, wTotal = 0;

    for (let i = startFrom; i < backtest.length - 1; i++) {
      const histSpins = backtest.slice(0, i);
      const nextNum = backtest[i].number;
      const ss = signal(histSpins);
      const predicted = getTopNForMode(ss, betMode);
      const isHit = predicted.includes(nextNum);
      const age = backtest.length - 1 - i;
      const dw = Math.pow(0.5, age / halfLife);
      if (isHit) wHits += dw;
      wTotal += dw;
    }

    const hitRate = wTotal > 0 ? wHits / wTotal : 0;
    const weight = Math.max(0.2, Math.min(2.5, 0.5 + (hitRate / baseline - 1) * 1.5));

    return { name: SIGNAL_NAMES[si], hitRate, baseline, weight };
  });
}

// ─── Combined prediction ──────────────────────────────────────────────────────

function buildCombined(spins, weights) {
  const combined = makeScores();
  SIGNALS.forEach((signal, i) => {
    const ss = signal(spins);
    const w = weights[i].weight;
    for (let n = 0; n <= 36; n++) combined[n] += w * ss[n];
  });

  // Suppress last number if not repeat-eligible
  if (spins.length >= 2) {
    const lastNum = spins[spins.length - 1].number;
    const repScore = signalRepeat(spins)[lastNum];
    if (repScore <= 0 || combined[lastNum] <= 0) {
      combined[lastNum] = -1;
    }
  }

  return combined;
}

// ─── Per-mode prediction results ─────────────────────────────────────────────

function buildSectorWindows(combined) {
  const windows = [];
  for (let start = 0; start < 37; start++) {
    const pockets = [];
    let score = 0;
    for (let d = 0; d < 5; d++) {
      const num = WHEEL[(start + d) % 37];
      pockets.push(num);
      score += combined[num];
    }
    windows.push({ start, pockets, score });
  }
  return windows.sort((a, b) => b.score - a.score);
}

function greedyTopWindows(sortedWindows, n) {
  const selected = [];
  const used = new Set();
  for (const w of sortedWindows) {
    if (selected.length >= n) break;
    if (w.pockets.every(p => !used.has(p))) {
      selected.push(w);
      w.pockets.forEach(p => used.add(p));
    }
  }
  return selected;
}

function predictNumbers(combined) {
  const positives = combined
    .map((score, n) => ({ n, score }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const totalMass = positives.reduce((s, x) => s + x.score, 0);
  return positives.slice(0, 5).map(x => ({
    number: x.n,
    confidence: totalMass > 0 ? x.score / totalMass : 0,
  }));
}

function predictSectors(combined) {
  const windows = buildSectorWindows(combined);
  const selected = greedyTopWindows(windows, 3);
  const totalMass = selected.reduce((s, w) => s + Math.max(0, w.score), 0);
  return selected.map((w, i) => ({
    label: `SECTOR ${i + 1}`,
    pockets: w.pockets,
    score: w.score,
    confidence: totalMass > 0 ? Math.max(0, w.score) / totalMass : 0,
  }));
}

function predictDozens(combined, spins) {
  const last12 = spins.slice(-12).map(s => s.number);
  return DOZENS.map((d, i) => {
    const baseScore = d.numbers.reduce((s, n) => s + combined[n], 0);
    const recency = d.numbers.filter(n => last12.includes(n)).length;
    return { index: i, label: d.label, numbers: d.numbers, score: baseScore + 2.5 * recency };
  }).sort((a, b) => b.score - a.score);
}

function predictColumns(combined, spins) {
  const last12 = spins.slice(-12).map(s => s.number);
  return COLUMNS.map((c, i) => {
    const baseScore = c.numbers.reduce((s, n) => s + combined[n], 0);
    const recency = c.numbers.filter(n => last12.includes(n)).length;
    return { index: i, label: c.label, numbers: c.numbers, score: baseScore + 2.5 * recency };
  }).sort((a, b) => b.score - a.score);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computePrediction(spins, betMode) {
  if (spins.length < 10) return null;

  const weights = computeWeights(spins, betMode);
  const combined = buildCombined(spins, weights);

  let result;
  switch (betMode) {
    case 'numbers':
      result = { type: 'numbers', picks: predictNumbers(combined) };
      break;
    case 'sectors':
      result = { type: 'sectors', sectors: predictSectors(combined) };
      break;
    case 'dozens':
      result = { type: 'dozens', ranked: predictDozens(combined, spins) };
      break;
    case 'columns':
      result = { type: 'columns', ranked: predictColumns(combined, spins) };
      break;
    default:
      result = null;
  }

  return { combined, result, weights };
}

// Returns the set of predicted pocket numbers for a given prediction result
export function getPredictedSet(predResult) {
  if (!predResult) return new Set();
  const { result } = predResult;
  if (!result) return new Set();
  switch (result.type) {
    case 'numbers':
      return new Set(result.picks.map(p => p.number));
    case 'sectors':
      return new Set(result.sectors.flatMap(s => s.pockets));
    case 'dozens':
      return new Set(result.ranked[0].numbers);
    case 'columns':
      return new Set(result.ranked[0].numbers);
    default:
      return new Set();
  }
}
