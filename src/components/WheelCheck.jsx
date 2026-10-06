import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { runWheelChecks, verdict, normalAbove } from '../lib/wheelCheck';
import { REPLAY_MODES } from '../hooks/useReplay';

const BADGE = {
  random:  { text: 'Looks random',          cls: 'text-muted border-white/10' },
  luck:    { text: 'Looks like luck',       cls: 'text-muted border-white/10' },
  watch:   { text: 'Worth watching',        cls: 'text-gold border-gold/40 bg-gold/10' },
  strong:  { text: 'Unlikely to be luck',   cls: 'text-win border-win/50 bg-win/10' },
  waiting: { text: 'Needs more spins',      cls: 'text-muted/70 border-white/[0.06]' },
};

function Badge({ kind }) {
  const b = BADGE[kind];
  return (
    <span className={`flex-shrink-0 text-[9px] font-bold tracking-wide2 uppercase border rounded-full px-2 py-0.5 whitespace-nowrap ${b.cls}`}>
      {b.text}
    </span>
  );
}

const fmtP = p => (p < 0.001 ? '< 0.001' : p.toFixed(p < 0.01 ? 3 : 2));

const MIN_REPLAY = 30;

function replayVerdict({ hits, done, chance }) {
  if (done < MIN_REPLAY) return { kind: 'waiting' };
  const z = (hits - chance * done) / Math.sqrt(done * chance * (1 - chance));
  const p = normalAbove(z);
  const v = verdict(p);
  return { kind: v !== 'random' ? v : 'luck', p };
}

export default function WheelCheck({ spins, replay, activeBetMode }) {
  const checks = useMemo(() => runWheelChecks(spins), [spins]);
  const replaying = REPLAY_MODES.some(m => replay[m].done < replay[m].total);

  return (
    <div className="panel p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="section-label !mb-0">Wheel Check</p>
        <span className="text-[9px] text-muted font-mono">{spins.length} spins</span>
      </div>
      <p className="text-[10px] text-muted leading-relaxed -mt-1">
        Tests whether this wheel or dealer shows anything a fair wheel wouldn’t. Re-checked every spin.
      </p>

      <div className="space-y-2.5">
        {checks.map(c => (
          <div key={c.key} className="space-y-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-white/90">{c.label}</div>
                <div className="text-[9px] text-muted leading-snug">{c.question}</div>
              </div>
              <Badge kind={c.needs ? 'waiting' : verdict(c.p)} />
            </div>
            <div className="text-[9px] font-mono text-label/80 leading-snug">
              {c.needs
                ? `${c.needs} more spin${c.needs === 1 ? '' : 's'} for a reliable test`
                : <>{c.detail} · <span className="text-label">p {fmtP(c.p)}</span></>}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-white/[0.05] space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-white/90">Engine replay</div>
          {replaying && <Loader2 size={12} className="animate-spin text-gold" />}
        </div>
        <div className="text-[9px] text-muted leading-snug">
          How the picks would have done on every recorded spin, predicting each one only from the spins before it.
        </div>
        {REPLAY_MODES.map(m => {
          const r = replay[m];
          const v = replayVerdict(r);
          const active = m === activeBetMode;
          return (
            <div key={m} className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${active ? 'bg-white/[0.03]' : ''}`}>
              <div className="min-w-0 text-[10px] font-mono">
                <span className={`uppercase tracking-wide2 ${active ? 'text-gold' : 'text-label'}`}>{m}</span>
                <span className="text-muted">×{r.coverage}</span>{' '}
                <span className="text-white/80">
                  {r.done ? `${(r.hits / r.done * 100).toFixed(1)}%` : '—'}
                </span>
                <span className="text-muted"> vs {(r.chance * 100).toFixed(1)}% · {r.hits}/{r.done}{r.done < r.total ? ` of ${r.total}` : ''}</span>
              </div>
              <Badge kind={v.kind} />
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-muted leading-relaxed pt-1 border-t border-white/[0.05]">
        p = the chance a fair wheel looks at least this uneven. Because everything is re-checked after every spin,
        a p below 0.01 will appear now and then by luck — only a result that stays there as spins pile up means something.
        Spotting a 5-point edge in Sectors takes about 600 spins from the same table.
      </p>
    </div>
  );
}
