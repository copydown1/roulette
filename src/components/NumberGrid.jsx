import { getColor } from '../lib/prediction';

// Standard casino felt layout (horizontal / desktop)
const TOP_ROW = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
const MID_ROW = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
const BOT_ROW = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
const H_ROWS = [TOP_ROW, MID_ROW, BOT_ROW];

// Portrait casino felt layout (vertical / mobile): 12 rows × 3 columns
const V_ROWS = Array.from({ length: 12 }, (_, i) => [i * 3 + 1, i * 3 + 2, i * 3 + 3]);

const ZERO_W = 36;
const GAP = 2;

function Pocket({ n, isPredicted, isLast, onClick }) {
  const c = getColor(n);
  const bg = c === 'red'   ? 'bg-pocket-red hover:bg-red-700'
           : c === 'black' ? 'bg-pocket-black hover:bg-zinc-700 border border-zinc-700'
           : 'bg-pocket-green hover:bg-green-700';
  const ring = isLast      ? 'ring-2 ring-[#e8e8e8] shadow-[0_0_6px_rgba(232,232,232,0.5)]'
             : isPredicted ? 'ring-2 ring-gold shadow-[0_0_8px_rgba(230,180,80,0.5)]'
             : '';
  return (
    <button
      onClick={() => onClick(n)}
      className={`pocket-base h-9 w-full rounded text-xs ${bg} text-white ${ring} transition-all`}
    >
      {n}
    </button>
  );
}

export default function NumberGrid({ predictedSet, lastNumber, onSpin }) {
  const zeroRing = lastNumber === 0
    ? 'ring-2 ring-[#e8e8e8] shadow-[0_0_6px_rgba(232,232,232,0.5)]'
    : predictedSet.has(0)
    ? 'ring-2 ring-gold shadow-[0_0_8px_rgba(230,180,80,0.5)]'
    : '';

  return (
    <div className="panel p-3">
      <p className="section-label">Numbers — Tap to record spin</p>
      <div className="felt-surface rounded-lg p-2">

        {/* ── Desktop: horizontal 3-row × 12-col casino layout ── */}
        <div className="hidden md:block">
          <div style={{ display: 'flex', gap: GAP, alignItems: 'stretch' }}>
            <button
              onClick={() => onSpin(0)}
              className={`pocket-base flex-shrink-0 rounded font-bold text-sm bg-pocket-green hover:bg-green-700 text-white ${zeroRing}`}
              style={{ width: ZERO_W, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              0
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: GAP }}>
              {H_ROWS.map((row, ri) => (
                <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: GAP }}>
                  {row.map(n => (
                    <Pocket key={n} n={n} isPredicted={predictedSet.has(n)} isLast={lastNumber === n} onClick={onSpin} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mobile: vertical 12-row × 3-col casino layout ── */}
        <div className="flex flex-col md:hidden" style={{ gap: GAP }}>
          <button
            onClick={() => onSpin(0)}
            className={`pocket-base w-full h-9 rounded font-bold text-sm bg-pocket-green hover:bg-green-700 text-white ${zeroRing}`}
          >
            0
          </button>
          {V_ROWS.map((row, ri) => (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: GAP }}>
              {row.map(n => (
                <Pocket key={n} n={n} isPredicted={predictedSet.has(n)} isLast={lastNumber === n} onClick={onSpin} />
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
