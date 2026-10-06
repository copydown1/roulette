import { getColor } from '../lib/prediction';

function Chip({ n, isWin }) {
  const c = getColor(n);
  const base = c === 'red' ? 'bg-pocket-red' : c === 'black' ? 'bg-pocket-black border border-border' : 'bg-pocket-green';
  const ring = isWin === true
    ? 'ring-2 ring-win'
    : isWin === false
    ? 'ring-2 ring-loss'
    : '';
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold font-mono text-white flex-shrink-0 ${base} ${ring}`}>
      {n}
    </span>
  );
}

export default function RecentSpins({ spins }) {
  const recent = spins.slice(-12).reverse();
  if (!recent.length) return null;

  return (
    <div className="panel p-3">
      <p className="section-label">Recent Spins</p>
      <div className="flex gap-1.5 flex-wrap">
        {recent.map((s, i) => (
          <Chip key={s.id ?? i} n={s.number} isWin={s.win} />
        ))}
      </div>
    </div>
  );
}
