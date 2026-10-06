export default function TableSettings({ settings, onChange, betMode }) {
  const { baseBet, payout, bankroll } = settings;
  const isOutside = betMode === 'dozens' || betMode === 'columns';

  function field(label, key, opts = {}) {
    return (
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-label tracking-wide2 uppercase">{label}</span>
        <input
          type="number"
          value={settings[key]}
          min={opts.min ?? 0}
          step={opts.step ?? 1}
          onChange={e => onChange({ ...settings, [key]: parseFloat(e.target.value) || 0 })}
          className="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono text-white
                     focus:outline-none focus:border-gold transition-colors"
        />
      </label>
    );
  }

  return (
    <div className="panel p-3 space-y-3">
      <p className="section-label">Table Settings</p>
      <div className="grid grid-cols-3 gap-3">
        {field('Base Bet ($)', 'baseBet', { min: 0.01, step: 0.01 })}

        {isOutside ? (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-label tracking-wide2 uppercase">Outside Payout</span>
            <div className="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono text-gold">
              2 : 1
            </div>
          </label>
        ) : (
          field('Straight-up Payout', 'payout', { min: 1, step: 1 })
        )}

        {field('Bankroll ($)', 'bankroll', { min: 0, step: 1 })}
      </div>
      <p className="text-[10px] text-muted">
        {isOutside
          ? 'Dozens and columns pay 2:1. Base bet stakes the full outside bet.'
          : `Payout = ${payout} (European straight-up default: 35).`}
      </p>
    </div>
  );
}
