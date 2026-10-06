import { evidenceLevel, MIN_SPINS_FOR_WEIGHTS } from '../lib/prediction';

const SIGNAL_INFO = {
  signature:    { label: 'Dealer signature',        hint: 'Ball travels a similar distance from the last number' },
  signatureAlt: { label: 'Dealer signature (alt.)', hint: 'Same, with ball direction flipping every spin' },
  area:         { label: 'Hot wheel area',          hint: 'Recent results and their wheel neighbours' },
  bias:         { label: 'Wheel bias',              hint: 'Pockets hitting more often across all spins' },
};

const LEVEL_STYLE = {
  none:     'text-muted border-white/10',
  weak:     'text-label border-white/20',
  moderate: 'text-gold border-gold/40 bg-gold/10',
  strong:   'text-win border-win/50 bg-win/10',
};

const MAX_WEIGHT = 2.5;

export default function SignalCalibration({ weights, spinCount, dealerSpins }) {
  if (spinCount < MIN_SPINS_FOR_WEIGHTS) {
    return (
      <div className="panel p-3 sm:p-4 space-y-2">
        <p className="section-label">Signal Calibration</p>
        <p className="text-[10px] text-muted leading-relaxed">
          Needs {MIN_SPINS_FOR_WEIGHTS}+ spins to start testing signals. Until then every signal has the same small weight.
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-3 sm:p-4 space-y-3">
      <p className="section-label">Signal Calibration</p>
      {weights.map(sig => {
        const info = SIGNAL_INFO[sig.name] ?? { label: sig.name, hint: '' };
        const level = evidenceLevel(sig.z);
        return (
          <div key={sig.name} className="space-y-1">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-white/90">{info.label}</div>
                <div className="text-[9px] text-muted leading-snug">{info.hint}</div>
                {sig.name.startsWith('signature') && dealerSpins != null && (
                  <div className="text-[9px] text-gold/70 leading-snug">
                    {dealerSpins === 0 ? 'New dealer — no spins yet' : `Current dealer: ${dealerSpins} spin${dealerSpins === 1 ? '' : 's'}`}
                  </div>
                )}
              </div>
              <span className={`flex-shrink-0 text-[9px] font-bold tracking-wide2 uppercase border rounded-full px-2 py-0.5 ${LEVEL_STYLE[level]}`}>
                {level === 'none' ? 'No evidence' : level}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative h-1.5 flex-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`absolute h-full rounded-full ${level === 'none' ? 'bg-muted' : level === 'weak' ? 'bg-label' : level === 'moderate' ? 'bg-gold' : 'bg-win'}`}
                  style={{ width: `${(sig.weight / MAX_WEIGHT) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-muted font-mono whitespace-nowrap">
                {(sig.hitRate * 100).toFixed(1)}% vs {(sig.baseline * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
      <p className="text-[9px] text-muted leading-relaxed pt-1 border-t border-white/[0.05]">
        Each signal is replayed on past spins, predicting every spin only from the ones before it.
        It gains weight (bar) only when its hit rate beats chance by more than luck explains.
        Patterns need real, consecutive spins from one table — reset after entering test numbers.
      </p>
    </div>
  );
}
