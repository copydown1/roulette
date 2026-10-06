import { WHEEL } from './prediction';

// Statistical checks for whether a wheel/dealer shows any pattern a fair wheel wouldn't.

const POS = {};
WHEEL.forEach((n, i) => { POS[n] = i; });

// ─── Distributions ────────────────────────────────────────────────────────────

function lnGamma(z) {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Regularized lower incomplete gamma P(a, x)
function gammaP(a, x) {
  if (x <= 0) return 0;
  const front = Math.exp(-x + a * Math.log(x) - lnGamma(a));
  if (x < a + 1) {
    let sum = 1 / a, term = sum;
    for (let n = 1; n < 1000; n++) {
      term *= x / (a + n);
      sum += term;
      if (term < sum * 1e-14) break;
    }
    return sum * front;
  }
  const tiny = 1e-300;
  let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return 1 - front * h;
}

export const chiSquareP = (x, df) => 1 - gammaP(df / 2, x / 2);
export const poissonAtLeast = (k, lambda) => (k <= 0 ? 1 : gammaP(k, lambda));

// P(Z > z) for a standard normal
export function normalAbove(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 - erf) / 2 : (1 + erf) / 2;
}

// Checked after every spin, so the bar is set well below the usual 0.05
export function verdict(p) {
  if (p < 0.001) return 'strong';
  if (p < 0.01) return 'watch';
  return 'random';
}

// ─── Wheel geometry ───────────────────────────────────────────────────────────

const VOISINS   = new Set([22,18,29,7,28,12,35,3,26,0,32,15,19,4,21,2,25]);
const TIERS     = new Set([27,13,36,11,30,8,23,10,5,24,16,33]);
const ORPHELINS = new Set([1,20,14,31,9,17,34,6]);

// Splits 0..36 (wheel positions or travel distances) into `k` near-equal bins
function bins(k) {
  const of = Array.from({ length: 37 }, (_, i) => Math.floor((i * k) / 37));
  const size = new Array(k).fill(0);
  of.forEach(b => size[b]++);
  return { of, size };
}
const ARCS = bins(12);
const TRAVEL_BINS = bins(6);

const chi = (obs, exp) => obs.reduce((s, o, i) => s + (o - exp[i]) ** 2 / exp[i], 0);

// ─── Checks ───────────────────────────────────────────────────────────────────

const MIN_DEALER_TRANSITIONS = 30;   // ~5 per travel bin

function check(key, label, question, minSpins, n, compute) {
  if (n < minSpins) return { key, label, question, needs: minSpins - n };
  return { key, label, question, ...compute() };
}

// Spin t was spun by the dealer whose first spin is the latest marker ≤ t
function dealerSegments(spins) {
  const starts = [0];
  spins.forEach((s, i) => { if (i > 0 && s.newDealer) starts.push(i); });
  return starts.map((s, k) => ({ start: s, end: starts[k + 1] ?? spins.length }));
}

function travelCheck(spins, alternating) {
  const label = alternating ? 'Dealer signature (alternating)' : 'Dealer signature';
  const question = alternating
    ? 'Does the ball travel a similar distance, with direction flipping each spin?'
    : 'Does the ball travel a similar distance from the last number?';
  const segments = dealerSegments(spins).map(({ start, end }) => {
    const hist = new Array(37).fill(0);
    for (let t = Math.max(1, start); t < end; t++) {
      let d = (POS[spins[t].number] - POS[spins[t - 1].number] + 37) % 37;
      if (alternating && t % 2 === 1) d = (37 - d) % 37;
      hist[d]++;
    }
    return { hist, n: hist.reduce((a, b) => a + b, 0) };
  });
  const usable = segments.filter(s => s.n >= MIN_DEALER_TRANSITIONS);
  if (!usable.length) {
    return { key: alternating ? 'signatureAlt' : 'signature', label, question, needs: MIN_DEALER_TRANSITIONS - segments.at(-1).n };
  }
  // Each dealer can have their own habit, so each is tested separately and the results combined
  let x = 0, df = 0;
  for (const s of usable) {
    const obs = new Array(6).fill(0);
    s.hist.forEach((c, d) => { obs[TRAVEL_BINS.of[d]] += c; });
    x += chi(obs, TRAVEL_BINS.size.map(k => (s.n * k) / 37));
    df += 5;
  }
  const latest = usable.at(-1);
  const current = segments.at(-1);
  const top = latest.hist.map((c, d) => [d, c]).sort((a, b) => b[1] - a[1])[0];
  const whose = latest === current
    ? (segments.length > 1 ? ' (current dealer)' : '')
    : ' (earlier dealer)';
  const notes = [];
  if (usable.length > 1) notes.push(`${usable.length} dealers tested`);
  if (latest !== current) notes.push(`current dealer needs ${MIN_DEALER_TRANSITIONS - current.n} more spins`);
  return {
    key: alternating ? 'signatureAlt' : 'signature',
    label,
    question,
    p: chiSquareP(x, df),
    detail: `Most common travel${whose}: ${top[0]} pockets — ${top[1]}× (${(latest.n / 37).toFixed(1)} expected)`
      + notes.map(t => ` · ${t}`).join(''),
  };
}

export function runWheelChecks(spins) {
  const nums = spins.map(s => s.number);
  const n = nums.length;

  return [
    check('pockets', 'Number bias', 'Does any number come up too often?', 185, n, () => {
      const counts = new Array(37).fill(0);
      nums.forEach(x => counts[x]++);
      const e = n / 37;
      const max = Math.max(...counts);
      const top = counts.map((c, k) => (c === max ? k : null)).filter(k => k !== null);
      return {
        p: chiSquareP(chi(counts, counts.map(() => e)), 36),
        detail: `Most frequent: ${top.slice(0, 3).join(', ')}${top.length > 3 ? '…' : ''} — ${max}×${top.length > 1 ? ' each' : ''} (${e.toFixed(1)} expected)`,
      };
    }),

    check('sections', 'Wheel sections', 'Does Voisins, Tiers or Orphelins come up too often?', 30, n, () => {
      const groups = [['Voisins', VOISINS], ['Tiers', TIERS], ['Orphelins', ORPHELINS]];
      const obs = groups.map(([, set]) => nums.filter(x => set.has(x)).length);
      const exp = groups.map(([, set]) => (n * set.size) / 37);
      return {
        p: chiSquareP(chi(obs, exp), 2),
        detail: groups.map(([name], i) => `${name} ${obs[i]} (${exp[i].toFixed(0)})`).join(' · ') + ' — seen (expected)',
      };
    }),

    check('area', 'Wheel area', 'Does one stretch of the wheel come up too often?', 62, n, () => {
      const obs = new Array(12).fill(0);
      nums.forEach(x => obs[ARCS.of[POS[x]]]++);
      const exp = ARCS.size.map(k => (n * k) / 37);
      const busiest = obs.map((o, a) => [a, o / exp[a], o]).sort((a, b) => b[1] - a[1])[0];
      const pockets = WHEEL.filter((_, pos) => ARCS.of[pos] === busiest[0]);
      return {
        p: chiSquareP(chi(obs, exp), 11),
        detail: `Busiest stretch: ${pockets.join('·')} — ${busiest[2]}× (${exp[busiest[0]].toFixed(1)} expected)`,
      };
    }),

    travelCheck(spins, false),
    travelCheck(spins, true),

    check('repeats', 'Repeats', 'Does the same number come up twice in a row too often?', 38, n, () => {
      const repeats = nums.slice(1).filter((x, i) => x === nums[i]).length;
      const lambda = (n - 1) / 37;
      return {
        p: poissonAtLeast(repeats, lambda),
        detail: `${repeats} time${repeats === 1 ? '' : 's'} (${lambda.toFixed(1)} expected)`,
      };
    }),
  ];
}
