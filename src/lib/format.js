export function money(v) {
  return `$${Math.abs(v).toFixed(2)}`;
}

export function signedMoney(v) {
  if (v > 0) return `+${money(v)}`;
  if (v < 0) return `−${money(v)}`;
  return money(0);
}
