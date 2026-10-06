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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeScores() { return new Array(37).fill(0); }

// Scores → non-negative weights summing to 1 (uniform when there's nothing to go on)
function normalize(scores) {
  const total = scores.reduce((a, b) => a + b, 0);
  return total > 0 ? scores.map(s => s / total) : new Array(37).fill(1 / 37);
}

export function getColor(n) {
  if (n === 0) return 'green';
  return RED.has(n) ? 'red' : 'black';
}

// ─── Signals ─────────────────────────────────────────────────────────────────
// Each signal sees only past spins and models a physical wheel/dealer effect.
// None assume a number is "due" or that colour/odd-even runs carry over.

// Release timing is never exact, so an observed travel distance also counts for ±2 pockets
const OFFSET_KERNEL = [0.25, 0.5, 1, 0.5, 0.25];
const SIGNATURE_HALF_LIFE = 40;   // spins — dealers drift
const SIGNATURE_WINDOW = 150;
// Spread evenly over all distances, worth ~8 spins: a new dealer's first few spins can't swing it
const SIGNATURE_PRIOR = (8 * OFFSET_KERNEL.reduce((a, b) => a + b, 0)) / 37;

// Index of the first spin by the current dealer (0 if no dealer change was marked)
export function dealerStart(spins) {
  for (let i = spins.length - 1; i > 0; i--) if (spins[i].newDealer) return i;
  return 0;
}

// Pockets travelled clockwise on the wheel from one result to the next, using only
// spins by the dealer who started at index `seg` (spin t was spun by that dealer if t ≥ seg).
// `alternating` assumes the ball direction flips every spin, so odd-indexed spins are mirrored.
function travelHistogram(spins, alternating, seg) {
  const hist = new Array(37).fill(SIGNATURE_PRIOR);
  const last = spins.length - 1;
  for (let t = Math.max(1, seg, spins.length - SIGNATURE_WINDOW); t <= last; t++) {
    let d = (WHEEL_POS[spins[t].number] - WHEEL_POS[spins[t - 1].number] + 37) % 37;
    if (alternating && t % 2 === 1) d = (37 - d) % 37;
    const w = Math.pow(0.5, (last - t) / SIGNATURE_HALF_LIFE);
    OFFSET_KERNEL.forEach((k, j) => { hist[(d + j - 2 + 37) % 37] += w * k; });
  }
  return hist;
}

function signalSignature(spins, alternating, seg) {
  if (spins.length < 2) return normalize(makeScores());
  const hist = travelHistogram(spins, alternating, seg);
  const lastPos = WHEEL_POS[spins[spins.length - 1].number];
  const flipNext = alternating && spins.length % 2 === 1;
  const scores = makeScores();
  for (let n = 0; n <= 36; n++) {
    let d = (WHEEL_POS[n] - lastPos + 37) % 37;
    if (flipNext) d = (37 - d) % 37;
    scores[n] = hist[d];
  }
  return normalize(scores);
}

// Area of the wheel recent results have landed in, spread to wheel neighbours
const AREA_KERNEL = [1, 0.7, 0.4, 0.15];
function signalArea(spins) {
  const scores = makeScores();
  const recent = spins.slice(-30);
  const last = recent.length - 1;
  recent.forEach((s, i) => {
    const w = Math.pow(0.5, (last - i) / 10);
    const pos = WHEEL_POS[s.number];
    for (let d = -3; d <= 3; d++) scores[WHEEL[(pos + d + 37) % 37]] += w * AREA_KERNEL[Math.abs(d)];
  });
  return normalize(scores);
}

// Long-run pocket frequency. The +1 prior keeps it near-uniform until there is a lot of data,
// because a real wheel bias only shows up over hundreds of spins.
function signalBias(spins) {
  const scores = new Array(37).fill(1);
  spins.slice(-1000).forEach(s => { scores[s.number] += 1; });
  return normalize(scores);
}

// fn(spins, seg): seg = index of the first spin by the dealer spinning next (only the signatures use it)
const SIGNALS = [
  { name: 'signature',    fn: (s, seg) => signalSignature(s, false, seg) },
  { name: 'signatureAlt', fn: (s, seg) => signalSignature(s, true, seg) },
  { name: 'area',         fn: s => signalArea(s) },
  { name: 'bias',         fn: s => signalBias(s) },
];

// ─── Evidence-based weights ───────────────────────────────────────────────────

// How much of the wheel a bet covers, per mode: pockets (numbers), 5-pocket wheel sectors (sectors),
// or groups of 12 (dozens / columns). More coverage wins more often but pays less per win.
export const COVERAGE_OPTIONS = {
  numbers: [5, 8, 10, 12, 18],
  sectors: [3, 4, 5],
  dozens:  [1, 2],
  columns: [1, 2],
};
export const DEFAULT_COVERAGE = { numbers: 5, sectors: 3, dozens: 1, columns: 1 };

// Pockets covered by a bet
export function pickCount(betMode, coverage = DEFAULT_COVERAGE[betMode]) {
  if (betMode === 'numbers') return coverage;
  if (betMode === 'sectors') return coverage * 5;
  return coverage * 12;
}

// How convincing a z-score is. With 4 signals tested, z ≥ 2.5 from luck alone is ~1 in 40.
export function evidenceLevel(z) {
  if (z >= 3.5) return 'strong';
  if (z >= 2.5) return 'moderate';
  if (z >= 1.5) return 'weak';
  return 'none';
}

function getTopNForMode(signalScores, betMode, coverage) {
  switch (betMode) {
    case 'numbers':
      return [...signalScores]
        .map((s, n) => ({ n, s }))
        .sort((a, b) => b.s - a.s)
        .slice(0, coverage)
        .map(x => x.n);
    case 'sectors':
      return greedyTopWindows(buildSectorWindows(signalScores), coverage).flatMap(w => w.pockets);
    case 'dozens':
      return rankGroups(DOZENS, signalScores).slice(0, coverage).flatMap(g => g.numbers);
    case 'columns':
      return rankGroups(COLUMNS, signalScores).slice(0, coverage).flatMap(g => g.numbers);
    default:
      return [];
  }
}

export const MIN_SPINS_FOR_WEIGHTS = 25;
const EVAL_WINDOW = 200;      // most recent spins replayed
const EVAL_HALF_LIFE = 100;   // older results count less (dealers and wheels change)
const BASE_WEIGHT = 0.25;     // every signal's weight until it shows evidence

// Replays each signal over past spins — predicting each spin only from the spins before it —
// and scores how unlikely its hit record is by luck (z-score vs the mode's chance rate).
// A signal only gains weight once z exceeds 1; the full 2.5 takes z = 4.
export function computeWeights(spins, betMode, coverage = DEFAULT_COVERAGE[betMode]) {
  const p = pickCount(betMode, coverage) / 37;
  if (spins.length < MIN_SPINS_FOR_WEIGHTS) {
    return SIGNALS.map(({ name }) => ({ name, hitRate: 0, baseline: p, z: 0, trials: 0, weight: BASE_WEIGHT }));
  }

  const start = Math.max(10, spins.length - EVAL_WINDOW);
  const last = spins.length - 1;

  // segAt[i]: first spin of the dealer who spun spin i (i itself when the dealer changed right before it)
  const segAt = [];
  let seg = 0;
  spins.forEach((s, i) => { if (s.newDealer) seg = i; segAt.push(seg); });

  return SIGNALS.map(({ name, fn }) => {
    let hits = 0, sw = 0, sw2 = 0;
    for (let i = start; i <= last; i++) {
      const picks = getTopNForMode(fn(spins.slice(0, i), segAt[i]), betMode, coverage);
      const w = Math.pow(0.5, (last - i) / EVAL_HALF_LIFE);
      if (picks.includes(spins[i].number)) hits += w;
      sw += w;
      sw2 += w * w;
    }
    const hitRate = hits / sw;
    const z = (hits - p * sw) / Math.sqrt(p * (1 - p) * sw2);
    const weight = BASE_WEIGHT + 0.75 * Math.min(3, Math.max(0, z - 1));
    return { name, hitRate, baseline: p, z, trials: Math.round((sw * sw) / sw2), weight };
  });
}

// ─── Combined prediction ──────────────────────────────────────────────────────

function buildCombined(spins, weights, seg) {
  const combined = makeScores();
  SIGNALS.forEach(({ fn }, i) => {
    const dist = fn(spins, seg);
    for (let n = 0; n <= 36; n++) combined[n] += weights[i].weight * dist[n];
  });
  return normalize(combined);
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

function predictNumbers(combined, count) {
  const positives = combined
    .map((score, n) => ({ n, score }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const totalMass = positives.reduce((s, x) => s + x.score, 0);
  return positives.slice(0, count).map(x => ({
    number: x.n,
    confidence: totalMass > 0 ? x.score / totalMass : 0,
  }));
}

function predictSectors(combined, count) {
  const windows = buildSectorWindows(combined);
  const selected = greedyTopWindows(windows, count);
  const totalMass = selected.reduce((s, w) => s + Math.max(0, w.score), 0);
  return selected.map((w, i) => ({
    label: `SECTOR ${i + 1}`,
    pockets: w.pockets,
    score: w.score,
    confidence: totalMass > 0 ? Math.max(0, w.score) / totalMass : 0,
  }));
}

function rankGroups(groups, combined) {
  return groups.map((g, i) => ({
    index: i,
    label: g.label,
    numbers: g.numbers,
    score: g.numbers.reduce((s, n) => s + combined[n], 0),
  })).sort((a, b) => b.score - a.score);
}

// ─── Main export ──────────────────────────────────────────────────────────────

// dealerPending: "New dealer" was pressed, so the next spin starts a fresh dealer with no history.
// coverage: how much of the wheel to bet on (see COVERAGE_OPTIONS).
export function computePrediction(spins, betMode, dealerPending = false, coverage = DEFAULT_COVERAGE[betMode]) {
  if (spins.length < 10) return null;

  const weights = computeWeights(spins, betMode, coverage);
  const seg = dealerPending ? spins.length : dealerStart(spins);
  const combined = buildCombined(spins, weights, seg);

  let result;
  switch (betMode) {
    case 'numbers':
      result = { type: 'numbers', picks: predictNumbers(combined, coverage) };
      break;
    case 'sectors':
      result = { type: 'sectors', sectors: predictSectors(combined, coverage) };
      break;
    case 'dozens':
      result = { type: 'dozens', ranked: rankGroups(DOZENS, combined), take: coverage };
      break;
    case 'columns':
      result = { type: 'columns', ranked: rankGroups(COLUMNS, combined), take: coverage };
      break;
    default:
      result = null;
  }

  const strongest = weights.reduce((a, b) => (b.z > a.z ? b : a));
  return { combined, result, weights, strongest, dealerSpins: spins.length - seg, coverage };
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
    case 'columns':
      return new Set(result.ranked.slice(0, result.take ?? 1).flatMap(g => g.numbers));
    default:
      return new Set();
  }
}
