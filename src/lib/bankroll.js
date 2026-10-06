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

// Net bankroll change when one of the n stakes hits. The winning stake coming back
// just cancels the money put down for it, so it adds nothing on top of the payout.
export function netPerHit(n, payout) {
  return payout - (n - 1);
}

// Compute dose for next bet: one hit should recover the current deficit.
export function computeDose(totalYield, baseBet, n, payout) {
  if (totalYield >= 0) return baseBet;
  const raw = (-totalYield) / netPerHit(n, payout);
  return Math.max(baseBet, Math.ceil(raw * 100) / 100);
}

// Largest dose (per position, whole cents) the remaining bankroll can cover across n positions.
export function affordableDose(dose, bankrollLeft, n) {
  const max = Math.floor((Math.max(0, bankrollLeft) / n) * 100 + 1e-9) / 100;
  return Math.min(dose, max);
}

// Net bankroll change for one spin.
// Hit: payout on the winning stake, minus the n-1 losing stakes. Miss: all n stakes lost.
export function computeNet(isHit, dose, n, payout) {
  return isHit ? dose * netPerHit(n, payout) : -(dose * n);
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
  // Only spins where a bet was actually placed
  const live = spins.filter(s => s.mode === 'live' && s.betMode === betMode && s.net != null);
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
