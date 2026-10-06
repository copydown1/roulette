import { getColor } from '../lib/prediction';

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

const MODE_NOTES = {
  numbers: 'Top 5 pockets by weighted signal score. Stake one dose on each.',
  sectors: 'Top 3 non-overlapping 5-pocket wheel arcs. Stake one dose per pocket.',
  dozens: 'Hottest 12-number dozen. Single outside bet at 2:1.',
  columns: 'Hottest 12-number column. Single outside bet at 2:1.',
};

export default function PredictionBar({ predResult, betMode, spinCount }) {
  if (spinCount < 10) {
    return (
      <div className="panel p-3 flex items-center gap-2">
        <span className="text-muted text-xs tracking-wide2 uppercase">
          Need {10 - spinCount} more spin{10 - spinCount !== 1 ? 's' : ''} to activate predictions
        </span>
      </div>
    );
  }

  if (!predResult) return null;
  const { result } = predResult;

  return (
    <div className="panel p-3 space-y-3">
      <p className="section-label">Prediction — {betMode.toUpperCase()} MODE</p>

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
            .map(g => (
              <GroupChip key={g.label} group={g} isBest={g.label === result.ranked[0].label} />
            ))}
        </div>
      )}

      <p className="text-[10px] text-muted leading-relaxed">{MODE_NOTES[betMode]}</p>
    </div>
  );
}
