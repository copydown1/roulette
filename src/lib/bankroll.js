// Bankroll math per spec

// Returns n (number of bets placed) and payout for a given bet mode
export function getBetParams(betMode, predictedSet, payout) {
  switch (betMode) {
    case 'numbers':
      return { n: predictedSet.size || 5, payout };
    case 'sectors':
      return { n: predictedSet.size || 15, payout };
    case 'dozens':
      return { n: 1, payout: 2 };
    case 'columns':
      return { n: 1, payout: 2 };
    default:
      return { n: 5, payout };
  }
}

// Compute dose for next bet
// totalYield = cumulative P&L for this bet mode's live spins
export function computeDose(totalYield, baseBet, n, payout) {
  if (totalYield >= 0) return baseBet;
  // dose needed: one hit covers all losses + one base-bet profit
  // net on hit = dose * (payout - (n-1)) = dose * (payout - n + 1)
  // Need: dose * (payout - n + 1) + totalYield >= baseBet
  // dose >= (baseBet - totalYield) / (payout - n + 1)
  // Simplified (as per spec): dose = ceil((-totalYield / (payout - (n-1))) * 100) / 100
  const raw = (-totalYield) / (payout - (n - 1));
  return Math.max(baseBet, Math.ceil(raw * 100) / 100);
}

// Compute net result of a round
// isHit = whether the actual spin landed in the predicted set
export function computeNet(isHit, dose, n, payout) {
  if (n === 1) {
    // Outside bet (dozens / columns): payout = 2
    return isHit ? dose * payout : -dose;
  }
  // Inside bets (numbers / sectors)
  return isHit ? dose * (payout - (n - 1)) : -(dose * n);
}

// Compute cumulative P&L from live spins.
// Pass betMode to scope to one mode; omit (or pass null) for the global bankroll.
export function computeYield(spins, betMode = null) {
  return spins
    .filter(s => s.mode === 'live' && (betMode === null || s.betMode === betMode) && s.net != null)
    .reduce((sum, s) => sum + s.net, 0);
}

// Stats for a bet mode
export function computeStats(spins, betMode) {
  const live = spins.filter(s => s.mode === 'live' && s.betMode === betMode);
  const wins = live.filter(s => s.win === true).length;
  const losses = live.filter(s => s.win === false).length;
  const betSpins = live.length;
  const hitRate = betSpins > 0 ? wins / betSpins : 0;

  // cumulative net for max drawdown
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const s of live) {
    cumulative += s.net ?? 0;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // max loss streak
  let maxStreak = 0;
  let curStreak = 0;
  for (const s of live) {
    if (s.win === false) {
      curStreak++;
      if (curStreak > maxStreak) maxStreak = curStreak;
    } else {
      curStreak = 0;
    }
  }

  const totalYield = live.reduce((s, x) => s + (x.net ?? 0), 0);

  return { wins, losses, betSpins, hitRate, maxDrawdown, maxStreak, totalYield };
}
