import { getColor, evidenceLevel, pickCount, COVERAGE_OPTIONS } from '../lib/prediction';
import { netPerHit } from '../lib/bankroll';

const SIGNAL_LABEL = {
  signature: 'Dealer signature',
  signatureAlt: 'Dealer signature (alternating)',
  area: 'Hot wheel area',
  bias: 'Wheel bias',
};

function EvidenceLine({ strongest }) {
  if (!strongest || strongest.trials === 0) {
    return <p className="text-[10px] text-muted">Too few spins to test any pattern yet — picks are a starting guess.</p>;
  }
  const level = evidenceLevel(strongest.z);
  if (level === 'none') {
    return (
      <p className="text-[10px] text-muted">
        No pattern has beaten chance yet — these picks are no better than random so far.
      </p>
    );
  }
  const tone = level === 'strong' ? 'text-win' : level === 'moderate' ? 'text-gold' : 'text-label';
  return (
    <p className="text-[10px] text-label">
      Led by <span className={`font-semibold ${tone}`}>{SIGNAL_LABEL[strongest.name] ?? strongest.name}</span>
      {' '}— <span className={tone}>{level} evidence</span> ({(strongest.hitRate * 100).toFixed(1)}% vs {(strongest.baseline * 100).toFixed(1)}% chance).
    </p>
  );
}

function NumberChip({ n, confidence }) {
  const c = getColor(n);
  const bg = c === 'red' ? 'bg-pocket-red' : c === 'black' ? 'bg-pocket-black border border-border' : 'bg-pocket-green';
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-mono text-sm text-white ${bg}`}>
        {n}
      </span>
      {confidence != null && (
        <div className="w-9 h-1 rounded bg-border overflow-hidden">
          <div className="h-full bg-gold" style={{ width: `${Math.round(confidence * 100)}%` }} />
        </div>
      )}
      {confidence != null && (
        <span className="text-[9px] text-label">{Math.round(confidence * 100)}%</span>
      )}
    </div>
  );
}

function SectorChip({ sector }) {
  return (
    <div className="flex flex-col gap-1 items-center">
      <div className="px-2 py-0.5 rounded border border-gold text-gold text-xs font-semibold tracking-wide2">
        {sector.label}
      </div>
      <div className="flex gap-1 flex-wrap justify-center">
        {sector.pockets.map(n => {
          const c = getColor(n);
          const bg = c === 'red' ? 'bg-pocket-red' : c === 'black' ? 'bg-pocket-black border border-border' : 'bg-pocket-green';
          return (
            <span key={n} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono text-white ${bg}`}>
              {n}
            </span>
          );
        })}
      </div>
      <div className="w-full h-1 rounded bg-border overflow-hidden">
        <div className="h-full bg-gold" style={{ width: `${Math.round(sector.confidence * 100)}%` }} />
      </div>
    </div>
  );
}

function GroupChip({ group, isBest }) {
  return (
    <div className={`flex-1 rounded p-2 border transition-colors ${isBest ? 'border-gold bg-gold/10' : 'border-border'}`}>
      <div className={`text-xs font-semibold tracking-wide2 uppercase mb-1.5 ${isBest ? 'text-gold' : 'text-label'}`}>
        {group.label}
      </div>
      <div className="flex flex-wrap gap-1">
        {group.numbers.map(n => {
          const c = getColor(n);
          const bg = c === 'red' ? 'bg-pocket-red' : c === 'black' ? 'bg-pocket-black border border-border' : 'bg-pocket-green';
          return (
            <span key={n} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono text-white ${bg}`}>
              {n}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const SPREAD_NOTE = 'They are spread around the wheel, so wheel patterns help them least.';
const MODE_NOTES = {
  numbers: k => `Top ${k} pockets by weighted signal score. Stake one dose on each.`,
  sectors: k => `Top ${k} non-overlapping 5-pocket wheel arcs. Stake one dose per pocket.`,
  dozens:  k => (k === 1
    ? `Dozen holding the most predicted weight. One outside bet at 2:1. ${SPREAD_NOTE}`
    : `The ${k} dozens holding the most predicted weight. One outside bet at 2:1 on each — one win covers the other stake. ${SPREAD_NOTE}`),
  columns: k => (k === 1
    ? `Column holding the most predicted weight. One outside bet at 2:1. ${SPREAD_NOTE}`
    : `The ${k} columns holding the most predicted weight. One outside bet at 2:1 on each — one win covers the other stake. ${SPREAD_NOTE}`),
};

const COVER_UNIT = { numbers: 'numbers', sectors: 'sectors', dozens: 'dozens', columns: 'columns' };

// What a bet of `k` covers: win chance, profit on a win and average result, both relative to the total stake
function betProfile(betMode, k, straightPayout) {
  const pockets = pickCount(betMode, k);
  const outside = betMode === 'dozens' || betMode === 'columns';
  const n = outside ? k : pockets;
  const payout = outside ? 2 : straightPayout;
  const win = pockets / 37;
  const perWin = netPerHit(n, payout) / n;
  return { win, perWin, average: win * perWin - (1 - win) };
}

const pct = v => `${(v * 100).toFixed(1)}%`;

function CoveragePicker({ betMode, value, onChange, straightPayout }) {
  const { win, perWin, average } = betProfile(betMode, value, straightPayout);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] tracking-wide2 uppercase text-label">Cover</span>
        <div className="flex p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          {COVERAGE_OPTIONS[betMode].map(k => (
            <button
              key={k}
              onClick={() => onChange(k)}
              aria-pressed={k === value}
              title={`Wins ${pct(betProfile(betMode, k, straightPayout).win)} of spins`}
              className={`min-w-[2rem] px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
                k === value ? 'bg-gold text-bg font-bold' : 'text-label hover:text-white'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <span className="text-[9px] tracking-wide2 uppercase text-label">{COVER_UNIT[betMode]}</span>
      </div>
      <p className="text-[10px] font-mono text-muted">
        Wins <span className="text-white/90">{pct(win)}</span> of spins · a win pays
        {' '}<span className="text-white/90">+{perWin.toFixed(perWin < 1 ? 2 : 1)}×</span> your stake ·
        {' '}average <span className={average < 0 ? 'text-loss/90' : 'text-win'}>{average < 0 ? '−' : '+'}{pct(Math.abs(average))}</span> per bet
      </p>
    </div>
  );
}

export default function PredictionBar({ predResult, betMode, spinCount, coverage, onCoverageChange, straightPayout }) {
  const result = predResult?.result;
  const chosen = new Set((result?.ranked ?? []).slice(0, result?.take ?? 1).map(g => g.label));

  return (
    <div className="panel p-3 space-y-3">
      <div className="space-y-2">
        <p className="section-label !mb-0">Prediction — {betMode.toUpperCase()} MODE</p>
        <CoveragePicker betMode={betMode} value={coverage} onChange={onCoverageChange} straightPayout={straightPayout} />
      </div>

      {spinCount < 10 || !predResult ? (
        <p className="text-muted text-xs tracking-wide2 uppercase">
          Need {Math.max(1, 10 - spinCount)} more spin{10 - spinCount !== 1 ? 's' : ''} to activate predictions
        </p>
      ) : (
        <>
          <EvidenceLine strongest={predResult.strongest} />

          {result?.type === 'numbers' && (
            <div className="flex gap-3 flex-wrap">
              {result.picks.map(p => <NumberChip key={p.number} n={p.number} confidence={p.confidence} />)}
            </div>
          )}

          {result?.type === 'sectors' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {result.sectors.map((s, i) => <SectorChip key={i} sector={s} />)}
            </div>
          )}

          {(result?.type === 'dozens' || result?.type === 'columns') && (
            <div className="flex gap-2">
              {[...result.ranked]
                .sort((a, b) => Math.min(...a.numbers) - Math.min(...b.numbers))
                .map(g => <GroupChip key={g.label} group={g} isBest={chosen.has(g.label)} />)}
            </div>
          )}

          <p className="text-[10px] text-muted leading-relaxed">{MODE_NOTES[betMode](coverage)}</p>
        </>
      )}
    </div>
  );
}
