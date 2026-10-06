export default function BloodMoneyPanel({ dose, totalYield, bankroll, baseBet, n, payout, mode }) {
  const bankrollNow  = bankroll + totalYield;
  const recovering   = totalYield < 0;
  const totalStake   = dose * n;
  const yieldColor   = totalYield >= 0 ? 'text-win' : 'text-loss';
  const bankColor    = bankrollNow >= bankroll ? 'text-win' : 'text-loss';
  const doseColor    = recovering ? 'text-gold' : 'text-white';

  // net return on a single hit: dose × (payout - (n-1))
  const hitReturn    = dose * (payout - (n - 1));

  return (
    <div className="panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="section-label">Next Bet</p>
        {recovering && (
          <span className="text-[9px] font-bold tracking-wide2 uppercase text-gold border border-gold/40 bg-gold/10 rounded px-1.5 py-0.5">
            Recovery
          </span>
        )}
      </div>

      {/* Primary: bet amount prominently */}
      <div className="flex items-end gap-3">
        <div>
          <div className={`font-mono font-bold text-3xl leading-none ${doseColor}`}>
            ${dose.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted mt-0.5 font-mono">
            per position
          </div>
        </div>

        {n > 1 && (
          <>
            <div className="text-label text-lg font-mono mb-0.5">×{n}</div>
            <div>
              <div className="font-mono font-bold text-xl text-label leading-none">
                ${totalStake.toFixed(2)}
              </div>
              <div className="text-[10px] text-muted mt-0.5 font-mono">total stake</div>
            </div>
          </>
        )}

        {/* Yield & bankroll on the right */}
        <div className="ml-auto flex gap-4 text-right">
          <div>
            <div className={`font-mono font-bold text-base leading-none ${yieldColor}`}>
              {totalYield >= 0 ? '+' : ''}${totalYield.toFixed(2)}
            </div>
            <div className="text-[10px] text-label tracking-wide2 uppercase mt-0.5">yield</div>
          </div>
          {mode === 'live' && (
            <div>
              <div className={`font-mono font-bold text-base leading-none ${bankColor}`}>
                ${bankrollNow.toFixed(2)}
              </div>
              <div className="text-[10px] text-label tracking-wide2 uppercase mt-0.5">bankroll</div>
            </div>
          )}
        </div>
      </div>

      {/* Recovery explanation */}
      {recovering && (
        <div className="rounded bg-gold/5 border border-gold/20 px-2 py-1.5 text-[10px] text-gold/80 leading-relaxed font-mono">
          One hit returns <strong className="text-gold">${hitReturn.toFixed(2)}</strong> net —
          covers ${Math.abs(totalYield).toFixed(2)} deficit + ${baseBet.toFixed(2)} profit.
        </div>
      )}
    </div>
  );
}
