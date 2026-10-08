const GOLD  = 'ring-2 ring-gold shadow-[0_0_8px_rgba(230,180,80,0.5)]';
const WHITE = 'ring-2 ring-[#e8e8e8] shadow-[0_0_6px_rgba(232,232,232,0.5)]';

// A pick always shows its gold ring; if it is also the last result, a white outline sits around the gold
export function pocketRingClass(isLast, isPredicted) {
  if (isPredicted && isLast) return `${GOLD} outline outline-2 outline-offset-[3px] outline-[#e8e8e8]`;
  if (isPredicted) return GOLD;
  if (isLast) return WHITE;
  return '';
}
