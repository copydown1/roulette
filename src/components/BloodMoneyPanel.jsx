import { AlertTriangle } from 'lucide-react';
import { money, signedMoney } from '../lib/format';
import { netPerHit } from '../lib/bankroll';

function Stat({ label, sub, value, tone }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2 text-right min-w-[88px]">
      <div className={`font-mono font-bold text-base leading-none ${tone}`}>{value}</div>
      <div className="text-[9px] text-label tracking-wide2 uppercase mt-1">{label}</div>
      {sub && <div className="text-[8px] text-muted tracking-wide2 uppercase">{sub}</div>}
    </div>
  );
}

function Notice({ tone, children }) {
  const styles = tone === 'loss'
    ? 'bg-loss/10 border-loss/30 text-red-300'
    : 'bg-gold/[0.06] border-gold/20 text-gold/80';
  return (
    <div className={`rounded-lg border px-3 py-2 text-[10px] leading-relaxed font-mono ${styles}`}>
      {children}
    </div>
  );
}

export default function BloodMoneyPanel({ dose, wantedDose, hasPrediction, totalYield, bankroll, n, payout, mode, unit }) {
  const bankrollNow = bankroll + totalYield;
  const recovering  = totalYield < 0;
  const broke       = hasPrediction && dose <= 0 && wantedDose > 0;
  const capped      = hasPrediction && dose > 0 && dose < wantedDose;
  const totalStake  = dose * n;
  const hitReturn   = dose * netPerHit(n, payout);

  let badge = null;
  if (broke) badge = { text: 'Out of bankroll', cls: 'text-white bg-loss border-loss' };
  else if (capped) badge = { text: 'Capped', cls: 'text-loss border-loss/50 bg-loss/10' };
  else if (recovering && hasPrediction) badge = { text: 'Recovery', cls: 'text-gold border-gold/40 bg-gold/10' };

  const highlight = broke || capped
    ? '!border-loss/40'
    : recovering && hasPrediction
    ? '!border-gold/40 shadow-[0_0_0_1px_rgba(230,180,80,0.08),0_12px_32px_-18px_rgba(230,180,80,0.35)]'
    : '';

  return (
    <div className={`panel p-3 sm:p-4 space-y-3 transition-shadow ${highlight}`}>
      <div className="flex items-center justify-between">
        <p className="section-label !mb-0">Next Bet</p>
        {badge && (
          <span className={`text-[9px] font-bold tracking-wide2 uppercase border rounded-full px-2 py-0.5 ${badge.cls}`}>
            {badge.text}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        {!hasPrediction ? (
          <div>
            <div className="font-mono font-bold text-2xl leading-none text-muted">No bet</div>
            <div className="text-[10px] text-muted mt-1 font-mono">waiting for a prediction</div>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <div>
              <div className={`font-mono font-bold text-4xl leading-none ${
                broke || capped ? 'text-loss' : recovering ? 'text-gold' : 'text-white'
              }`}>
                {money(dose)}
              </div>
              <div className="text-[10px] text-muted mt-1 font-mono">{unit}</div>
            </div>
            {n > 1 && dose > 0 && (
              <div className="pb-4 font-mono text-label">
                <span className="text-sm">×{n} =</span>{' '}
                <span className="text-lg font-bold text-white/80">{money(totalStake)}</span>
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <Stat
            label="Total yield"
            sub="all modes"
            value={signedMoney(totalYield)}
            tone={totalYield > 0 ? 'text-win' : totalYield < 0 ? 'text-loss' : 'text-white'}
          />
          {mode === 'live' && (
            <Stat
              label="Bankroll"
              sub="left"
              value={bankrollNow < 0 ? `−${money(bankrollNow)}` : money(bankrollNow)}
              tone={bankrollNow >= bankroll ? 'text-win' : 'text-loss'}
            />
          )}
        </div>
      </div>

      {broke && (
        <Notice tone="loss">
          <AlertTriangle size={11} className="inline -mt-0.5 mr-1" />
          Only {money(Math.max(0, bankrollNow))} left — not enough for any bet. Spins are recorded without a bet
          until you raise the bankroll in Table Settings or reset the session.
        </Notice>
      )}

      {capped && (
        <Notice tone="loss">
          <AlertTriangle size={11} className="inline -mt-0.5 mr-1" />
          Recovery needs {money(wantedDose)} {unit}{n > 1 ? ` (${money(wantedDose * n)} in total)` : ''}, but only {money(bankrollNow)} is left.
          Bet capped at what you can cover — one hit returns {money(hitReturn)} and won't fully recover
          the {money(totalYield)} deficit.
        </Notice>
      )}

      {!broke && !capped && recovering && hasPrediction && (
        <Notice tone="gold">
          One hit returns <strong className="text-gold">{money(hitReturn)}</strong> net —
          covers the {money(totalYield)} deficit.
        </Notice>
      )}
    </div>
  );
}
