import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Undo2, Download, Upload } from 'lucide-react';
import { money, signedMoney } from '../lib/format';
import { pickCount } from '../lib/prediction';

function Tile({ label, value, sub, tone = 'text-white', className = '' }) {
  return (
    <div className={`rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2.5 ${className}`}>
      <div className="text-[9px] text-label tracking-wide2 uppercase">{label}</div>
      <div className={`font-mono font-bold text-lg leading-tight mt-1 ${tone}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted font-mono mt-0.5">{sub}</div>}
    </div>
  );
}

export default function MissionReport({ allStats, activeBetMode, coverage, totalSpins, onUndo, onReset, onExport, onImport }) {
  const s = allStats[activeBetMode] ?? {};
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 3000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return; }
    setConfirmReset(false);
    onReset();
  }

  const yieldVal = s.totalYield ?? 0;
  const empty = totalSpins === 0;

  return (
    <div className="panel p-3 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="section-label !mb-1">Mission Report</p>
          <p className="text-[10px] text-muted tracking-wide2 uppercase pl-[11px]">{activeBetMode} mode</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onUndo}
            disabled={empty}
            className="btn-ghost flex items-center gap-1 !px-2 !py-1 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Undo2 size={12} />
            <span className="text-[10px]">Undo</span>
          </button>
          <button
            onClick={handleReset}
            disabled={empty}
            className={`btn-ghost flex items-center gap-1 !px-2 !py-1 disabled:opacity-30 disabled:pointer-events-none ${
              confirmReset ? '!border-loss !text-white !bg-loss' : 'hover:!border-loss hover:!text-loss'
            }`}
          >
            <RotateCcw size={12} />
            <span className="text-[10px]">{confirmReset ? 'Confirm?' : 'Reset'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile
          className="col-span-2"
          label={`${activeBetMode} yield`}
          value={signedMoney(yieldVal)}
          sub="this mode only — Next Bet shows all modes"
          tone={yieldVal > 0 ? 'text-win' : yieldVal < 0 ? 'text-loss' : 'text-white'}
        />
        <Tile
          label="Hit rate"
          value={s.betSpins ? `${(s.hitRate * 100).toFixed(1)}%` : '—'}
          sub={`${s.wins ?? 0}W · ${s.losses ?? 0}L · chance ${((s.chance ?? pickCount(activeBetMode, coverage) / 37) * 100).toFixed(1)}%`}
        />
        <Tile
          label="Bet spins"
          value={s.betSpins ?? 0}
          sub={`of ${totalSpins} total`}
        />
        <Tile
          label="Max drawdown"
          value={money(s.maxDrawdown ?? 0)}
          tone={s.maxDrawdown > 0 ? 'text-loss' : 'text-white'}
        />
        <Tile
          label="Max loss streak"
          value={s.maxStreak ?? 0}
          tone={s.maxStreak > 0 ? 'text-loss' : 'text-white'}
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.05]">
        <span className="text-[9px] text-muted tracking-wide2 uppercase">Saved in this browser only</span>
        <div className="flex gap-1.5">
          <button
            onClick={onExport}
            disabled={empty}
            className="btn-ghost flex items-center gap-1 !px-2 !py-1 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Download size={12} />
            <span className="text-[10px]">Export</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-ghost flex items-center gap-1 !px-2 !py-1"
          >
            <Upload size={12} />
            <span className="text-[10px]">Import</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onImport(file);
            }}
          />
        </div>
      </div>
    </div>
  );
}
