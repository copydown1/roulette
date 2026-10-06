const INPUT = 'w-full h-9 bg-black/40 border border-white/[0.08] rounded-lg text-sm font-mono text-white ' +
              'focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-colors';

export default function TableSettings({ settings, onChange, betMode }) {
  const isOutside = betMode === 'dozens' || betMode === 'columns';

  function field(label, key, opts = {}) {
    return (
      <label className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[9px] sm:text-[10px] text-label tracking-wide2 uppercase truncate">{label}</span>
        <div className="relative">
          {opts.prefix && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-sm font-mono pointer-events-none">
              {opts.prefix}
            </span>
          )}
          <input
            type="number"
            value={settings[key]}
            min={opts.min ?? 0}
            step={opts.step ?? 1}
            onChange={e => onChange({ ...settings, [key]: parseFloat(e.target.value) || 0 })}
            className={`${INPUT} ${opts.prefix ? 'pl-6 pr-2' : 'px-2.5'}`}
          />
        </div>
      </label>
    );
  }

  return (
    <div className="panel p-3 sm:p-4 space-y-3">
      <p className="section-label">Table Settings</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {field('Base Bet', 'baseBet', { min: 0.01, step: 0.01, prefix: '$' })}

        {isOutside ? (
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] text-label tracking-wide2 uppercase truncate">Outside Payout</span>
            <div className={`${INPUT} px-2.5 flex items-center text-gold`}>2 : 1</div>
          </div>
        ) : (
          field('Straight-up', 'payout', { min: 1, step: 1 })
        )}

        {field('Bankroll', 'bankroll', { min: 0, step: 1, prefix: '$' })}
      </div>
      <p className="text-[10px] text-muted">
        {isOutside
          ? 'Dozens and columns pay 2:1. Base bet stakes the full outside bet.'
          : `Straight-up pays ${settings.payout}:1 (European default 35).`}
      </p>
    </div>
  );
}
