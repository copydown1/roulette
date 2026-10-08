import { Fragment } from 'react';
import { getColor, DOZENS, COLUMNS } from '../lib/prediction';
import { pocketRingClass } from '../lib/pocketRing';

// Horizontal desktop layout rows
const TOP_ROW = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
const MID_ROW = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
const BOT_ROW = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
const H_ROWS = [TOP_ROW, MID_ROW, BOT_ROW];

// Vertical mobile layout: 12 rows × 3 cols → [1,2,3], [4,5,6], ...
const V_ROWS = Array.from({ length: 12 }, (_, i) => [i * 3 + 1, i * 3 + 2, i * 3 + 3]);
// Column labels left→right in portrait: COL1, COL2, COL3
const V_COLS = [COLUMNS[2], COLUMNS[1], COLUMNS[0]];

const ZERO_W  = 36;
const COL21_W = 42;
const GAP     = 2;

function Pocket({ n, isPredicted, isLast, onClick }) {
  const c = getColor(n);
  const bg = c === 'red'   ? 'bg-pocket-red hover:bg-red-700'
           : c === 'black' ? 'bg-[#1a1a1a] hover:bg-zinc-700 border border-zinc-700'
           : 'bg-pocket-green hover:bg-green-700';
  const ring = pocketRingClass(isLast, isPredicted);
  return (
    <button
      onClick={() => onClick(n)}
      className={`pocket-base h-9 w-full rounded text-xs ${bg} text-white ${ring}`}
    >
      {n}
    </button>
  );
}

export default function RouletteTable({ predictedSet, lastNumber, onSpin, betMode, predResult }) {
  // Labels of the dozens / columns being bet on (one or two, depending on coverage)
  const result = predResult?.result;
  const chosen = new Set(
    result?.type === betMode ? result.ranked.slice(0, result.take ?? 1).map(g => g.label) : []
  );
  const ring = on => (on ? 'border-gold bg-gold/10 text-gold' : 'border-border/50 text-label');

  // Horizontal: rowIdx 0=COL3, 1=COL2, 2=COL1
  const colRing = rowIdx => ring(betMode === 'columns' && chosen.has(COLUMNS[rowIdx].label));
  const dozenRing = d => ring(betMode === 'dozens' && chosen.has(d.label));
  // Vertical layout passes the column object itself
  const colRingByCol = col => ring(betMode === 'columns' && chosen.has(col.label));

  const zeroRing = pocketRingClass(lastNumber === 0, predictedSet.has(0));

  // Maps vertical row index to dozen index (strip shown after rows 3, 7, 11)
  const DOZEN_STRIP = { 3: 0, 7: 1, 11: 2 };

  return (
    <div className="panel p-3">
      <p className="section-label">Table — Tap to record spin</p>

      {/* ── Desktop: horizontal casino layout ── */}
      <div className="felt-surface rounded-lg p-2 hidden md:block overflow-x-auto">
        <div style={{ minWidth: 480 }}>

          <div style={{ display: 'flex', gap: GAP, alignItems: 'stretch' }}>
            {/* Zero */}
            <button
              onClick={() => onSpin(0)}
              className={`pocket-base flex-shrink-0 rounded font-bold text-sm bg-pocket-green hover:bg-green-700 text-white ${zeroRing}`}
              style={{ width: ZERO_W, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              0
            </button>

            {/* 3 rows × 12 cols */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: GAP }}>
              {H_ROWS.map((row, ri) => (
                <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: GAP }}>
                  {row.map(n => (
                    <Pocket key={n} n={n} isPredicted={predictedSet.has(n)} isLast={lastNumber === n} onClick={onSpin} />
                  ))}
                </div>
              ))}
            </div>

            {/* 2:1 column labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, width: COL21_W, flexShrink: 0 }}>
              {COLUMNS.map((col, ri) => (
                <div
                  key={col.label}
                  className={`flex-1 flex items-center justify-center rounded text-[9px] font-bold tracking-wide2 uppercase border ${colRing(ri)}`}
                  style={{ minHeight: 36 }}
                >
                  2:1
                </div>
              ))}
            </div>
          </div>

          {/* Dozens row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: GAP,
              marginTop: GAP,
              paddingLeft: ZERO_W + GAP,
              paddingRight: COL21_W + GAP,
            }}
          >
            {DOZENS.map(doz => (
              <div
                key={doz.label}
                className={`flex items-center justify-center py-1.5 rounded text-[9px] font-bold tracking-wide2 uppercase border cursor-default ${dozenRing(doz)}`}
              >
                {doz.label.toUpperCase()}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Mobile: vertical 12-row × 3-col casino layout ── */}
      <div className="felt-surface rounded-lg p-2 flex flex-col md:hidden" style={{ gap: GAP }}>

        {/* Zero spanning full width */}
        <button
          onClick={() => onSpin(0)}
          className={`pocket-base w-full h-9 rounded font-bold text-sm bg-pocket-green hover:bg-green-700 text-white ${zeroRing}`}
        >
          0
        </button>

        {/* Number rows with optional dozen strips */}
        {V_ROWS.map((row, ri) => (
          <Fragment key={ri}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: GAP }}>
              {row.map(n => (
                <Pocket key={n} n={n} isPredicted={predictedSet.has(n)} isLast={lastNumber === n} onClick={onSpin} />
              ))}
            </div>
            {betMode === 'dozens' && DOZEN_STRIP[ri] !== undefined && (
              <div className={`flex items-center justify-center py-1.5 rounded text-[9px] font-bold tracking-wide2 uppercase border ${dozenRing(DOZENS[DOZEN_STRIP[ri]])}`}>
                {DOZENS[DOZEN_STRIP[ri]].label.toUpperCase()}
              </div>
            )}
          </Fragment>
        ))}

        {/* Column labels at bottom (columns mode) */}
        {betMode === 'columns' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: GAP }}>
            {V_COLS.map(col => (
              <div
                key={col.label}
                className={`flex items-center justify-center py-1.5 rounded text-[9px] font-bold tracking-wide2 uppercase border ${colRingByCol(col)}`}
              >
                {col.label}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
