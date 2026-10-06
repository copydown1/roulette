const SIGNAL_LABELS = {
  hot: 'Hot (recency)',
  bias: 'Bias (history)',
  due: 'Due (overdue)',
  sector: 'Sector halo',
  memory: 'Memory',
  repeat: 'Repeat',
  streak: 'Streak',
  signature: 'Signature',
};

function WeightBar({ weight }) {
  // weight is 0.2 to 2.5, baseline 1.0
  const pct = ((weight - 0.2) / (2.5 - 0.2)) * 100;
  const baselinePct = ((1.0 - 0.2) / (2.5 - 0.2)) * 100;
  const color = weight >= 1 ? '#3a9e65' : weight >= 0.6 ? '#e6b450' : '#c53a3a';
  return (
    <div className="relative h-2 w-full bg-border rounded">
      <div className="absolute h-full rounded" style={{ width: `${pct}%`, backgroundColor: color }} />
      <div className="absolute top-0 h-full w-px bg-muted/60" style={{ left: `${baselinePct}%` }} />
    </div>
  );
}

export default function SignalCalibration({ weights, spinCount }) {
  if (spinCount < 25) {
    return (
      <div className="panel p-3 space-y-2">
        <p className="section-label">Signal Calibration</p>
        <p className="text-[10px] text-muted">Need 25+ spins to calibrate. Default weight 1.0 active.</p>
      </div>
    );
  }

  return (
    <div className="panel p-3 space-y-2.5">
      <p className="section-label">Signal Calibration</p>
      {weights.map(sig => (
        <div key={sig.name} className="space-y-0.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-label">{SIGNAL_LABELS[sig.name] ?? sig.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted font-mono">
                {(sig.hitRate * 100).toFixed(1)}% vs {(sig.baseline * 100).toFixed(1)}%
              </span>
              <span className={`text-[10px] font-bold font-mono w-8 text-right
                ${sig.weight >= 1 ? 'text-win' : sig.weight >= 0.6 ? 'text-gold' : 'text-loss'}`}>
                ×{sig.weight.toFixed(2)}
              </span>
            </div>
          </div>
          <WeightBar weight={sig.weight} />
        </div>
      ))}
      <p className="text-[9px] text-muted mt-1">
        Bar = weight (0.2–2.5). Tick = baseline 1.0. Green = outperforming blind chance.
      </p>
    </div>
  );
}
