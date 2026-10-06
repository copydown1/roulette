// crypto.randomUUID only exists on HTTPS or localhost; plain-http (e.g. a phone on the LAN) needs the fallback.
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
