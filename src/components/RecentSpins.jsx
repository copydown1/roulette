import { getColor } from '../lib/prediction';

function Chip({ n, isWin, large, fade = 1 }) {
  const c = getColor(n);
  const base = c === 'red' ? 'bg-pocket-red' : c === 'black' ? 'bg-pocket-black border border-white/10' : 'bg-pocket-green';
  const ring = isWin === true ? 'ring-2 ring-win' : isWin === false ? 'ring-2 ring-loss/80' : '';
  const size = large ? 'w-12 h-12 text-lg' : 'w-8 h-8 text-xs';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold font-mono text-white flex-shrink-0 ${size} ${base} ${ring}`}
      style={{ opacity: fade }}
    >
      {n}
    </span>
  );
}

export default function RecentSpins({ spins }) {
  const recent = spins.slice(-15).reverse();
  if (!recent.length) return null;
  const [last, ...rest] = recent;
  const hasLive = recent.some(s => s.win != null);

  return (
    <div className="panel p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-label !mb-0">Recent Spins</p>
        <div className="flex items-center gap-3 text-[9px] tracking-wide2 uppercase text-muted">
          {hasLive && (
            <>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full ring-2 ring-win" />Hit</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full ring-2 ring-loss/80" />Miss</span>
            </>
          )}
          <span className="font-mono">{spins.length} total</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1 flex-shrink-0 p-1">
          <Chip n={last.number} isWin={last.win} large />
          <span className="text-[8px] tracking-wide2 uppercase text-label">Last</span>
        </div>
        {rest.length > 0 && <div className="w-px self-stretch bg-white/[0.06]" />}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar p-1 min-w-0">
          {rest.map((s, i) => (
            <Chip key={s.id ?? i} n={s.number} isWin={s.win} fade={Math.max(0.35, 1 - i * 0.05)} />
          ))}
        </div>
      </div>
    </div>
  );
}
