import { RotateCcw, Undo2 } from 'lucide-react';

const BET_MODES = ['numbers', 'sectors', 'dozens', 'columns'];

function StatRow({ label, value, colorClass = 'text-white' }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
      <span className="text-[10px] text-label tracking-wide2 uppercase">{label}</span>
      <span className={`font-mono text-sm font-bold ${colorClass}`}>{value}</span>
    </div>
  );
}

export default function MissionReport({ allStats, activeBetMode, totalSpins, onUndo, onReset }) {
  const s = allStats[activeBetMode] ?? {};

  return (
    <div className="panel p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="section-label mb-0">Mission Report</p>
        <div className="flex gap-1.5">
          <button onClick={onUndo} className="btn-ghost flex items-center gap-1 !px-2 !py-1">
            <Undo2 size={12} />
            <span className="text-[10px]">Undo</span>
          </button>
          <button onClick={onReset} className="btn-ghost flex items-center gap-1 !px-2 !py-1 hover:!border-loss hover:!text-loss">
            <RotateCcw size={12} />
            <span className="text-[10px]">Reset</span>
          </button>
        </div>
      </div>

      {/* Bet mode tabs */}
      <div className="flex gap-1 flex-wrap">
        {BET_MODES.map(m => (
          <span
            key={m}
            className={`px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide2 uppercase border
              ${m === activeBetMode ? 'border-gold text-gold' : 'border-border text-muted'}`}
          >
            {m}
          </span>
        ))}
      </div>

      <div>
        <StatRow label="Total spins" value={totalSpins} />
        <StatRow label="Bet spins" value={s.betSpins ?? 0} />
        <StatRow label="Wins" value={s.wins ?? 0} colorClass="text-win" />
        <StatRow label="Losses" value={s.losses ?? 0} colorClass="text-loss" />
        <StatRow
          label="Hit rate"
          value={s.hitRate != null ? `${(s.hitRate * 100).toFixed(1)}%` : '—'}
          colorClass={s.hitRate >= 0.5 ? 'text-win' : 'text-loss'}
        />
        <StatRow
          label="Session yield"
          value={s.totalYield != null ? `${s.totalYield >= 0 ? '+' : ''}$${s.totalYield.toFixed(2)}` : '—'}
          colorClass={s.totalYield >= 0 ? 'text-win' : 'text-loss'}
        />
        <StatRow
          label="Max drawdown"
          value={s.maxDrawdown != null ? `$${s.maxDrawdown.toFixed(2)}` : '—'}
          colorClass="text-loss"
        />
        <StatRow
          label="Max loss streak"
          value={s.maxStreak ?? '—'}
          colorClass="text-loss"
        />
      </div>
    </div>
  );
}
