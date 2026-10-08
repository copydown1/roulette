import { getColor } from '../lib/prediction';

// Horizontal track, clockwise: top row L→R, right caps T→B, bottom row R→L, left caps B→T
const LEFT_CAPS  = [0, 26, 3];
const TOP_ROW    = [32,15,19,4,21,2,25,17,34,6,27,13,36,11,30];
const RIGHT_CAPS = [8, 23, 10];
const BOT_ROW    = [35,12,28,7,29,18,22,9,31,14,20,1,33,16,24,5];

// Vertical track (phones) is the horizontal one rotated 90° clockwise
const V_TOP_CAPS = [...LEFT_CAPS].reverse();   // 3 26 0
const V_RIGHT    = TOP_ROW;                    // 32 … 30, top→bottom
const V_BOT_CAPS = [...RIGHT_CAPS].reverse();  // 10 23 8
const V_LEFT     = BOT_ROW;                    // 35 … 5, top→bottom

const VOISINS   = new Set([0,2,3,4,7,12,15,18,19,21,22,25,26,28,29,32,35]);
const TIERS     = new Set([5,8,10,11,13,16,23,24,27,30,33,36]);
const ORPHELINS = new Set([1,6,9,14,17,20,31,34]);
const ZERO_GAME = new Set([0,3,12,15,26,32,35]);

const SECTORS = [
  { key: 'zero',      label: '0 GAME',    nums: ZERO_GAME,  color: '#7acc50', border: '#3d7a22', bg: '#1a3a0e' },
  { key: 'voisins',   label: 'VOISINS',   nums: VOISINS,    color: '#50aae0', border: '#1f5a80', bg: '#0a2030' },
  { key: 'orphelins', label: 'ORPHELINS', nums: ORPHELINS,  color: '#e07070', border: '#7a2020', bg: '#280c0c' },
  { key: 'tiers',     label: 'TIERS',     nums: TIERS,      color: '#b07ae0', border: '#5a3a88', bg: '#180a2a' },
];

const RAIL_BG     = '#0c2e14';
const INNER_BG    = '#0d5a2a';
const OVAL_BORDER = '#1a7a35';

// Size presets
const H_RAIL = { flex: '1 1 0', minWidth: 16, height: 26 };
const H_CAP  = { width: 28, height: 28, flexShrink: 0 };
const V_RAIL = { width: 32, flex: '1 1 0', minHeight: 28 };
const V_CAP  = { width: 32, height: 32, flexShrink: 0 };

// A pick always shows its gold ring; if it is also the last result, a white ring sits around the gold
function pocketRing(isLast, isPredicted) {
  if (isPredicted && isLast) return { outline: '2px solid #e6b450', outlineOffset: '1px', boxShadow: '0 0 0 4px #0c2e14, 0 0 0 6px #e8e8e8' };
  if (isPredicted) return { outline: '2px solid #e6b450', outlineOffset: '1px', boxShadow: '0 0 8px rgba(230,180,80,0.65)' };
  if (isLast)      return { outline: '2px solid #e8e8e8', outlineOffset: '1px', boxShadow: '0 0 6px rgba(232,232,232,0.5)' };
  return {};
}

function Pocket({ n, predictedSet, lastNumber, onClick, size }) {
  const c = getColor(n);
  const bg      = c === 'red' ? '#a82828' : c === 'black' ? '#141414' : '#1a6335';
  const hoverBg = c === 'red' ? '#cc3030' : c === 'black' ? '#252525' : '#228844';
  return (
    <button
      onClick={() => onClick(n)}
      style={{
        ...size,
        borderRadius: '50%',
        backgroundColor: bg,
        border: c === 'black' ? '1px solid #333' : '1px solid transparent',
        color: '#fff',
        fontFamily: 'monospace',
        fontWeight: 700,
        fontSize: size === V_RAIL || size === V_CAP ? 11 : 10,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background-color 0.1s',
        ...pocketRing(lastNumber === n, predictedSet.has(n)),
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = hoverBg; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = bg; }}
    >
      {n}
    </button>
  );
}

function SectorLabels({ bestSector, vertical }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: vertical ? '12px 4px' : '8px 4px',
      gap: vertical ? 10 : 4,
    }}>
      {SECTORS.map(s => (
        <div key={s.key} style={{
          color: s.color,
          border: `1px solid ${s.border}`,
          background: s.bg,
          borderRadius: 4,
          padding: '2px 6px',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.15em',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          boxShadow: s.key === bestSector ? `0 0 6px rgba(230,180,80,0.5), inset 0 0 8px ${s.border}44` : 'none',
          outline: s.key === bestSector ? '1px solid #e6b450' : 'none',
          outlineOffset: 1,
        }}>
          {s.label}
        </div>
      ))}
    </div>
  );
}

export default function RacetrackGrid({ predictedSet, lastNumber, onSpin }) {
  const bestSector = SECTORS.reduce((best, s) => {
    const score = [...s.nums].filter(n => predictedSet.has(n)).length;
    return score > best.score ? { key: s.key, score } : best;
  }, { key: null, score: -1 }).key;

  const p = { predictedSet, lastNumber, onClick: onSpin };
  const band = { display: 'flex', alignItems: 'center', gap: 3 };

  return (
    <div className="panel p-3 space-y-2">
      <p className="section-label">Sectors — Racetrack</p>

      {/* ── Wide screens: horizontal oval ── */}
      <div className="hidden sm:block" style={{ borderRadius: 60, border: `2px solid ${OVAL_BORDER}`, background: RAIL_BG, overflow: 'hidden' }}>
        <div style={{ ...band, padding: '5px 42px' }}>
          {TOP_ROW.map(n => <Pocket key={n} n={n} {...p} size={H_RAIL} />)}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', background: INNER_BG,
          borderTop: `1px solid ${OVAL_BORDER}`, borderBottom: `1px solid ${OVAL_BORDER}`,
        }}>
          <div style={{ ...band, flexDirection: 'column', padding: '4px 6px', background: RAIL_BG }}>
            {LEFT_CAPS.map(n => <Pocket key={n} n={n} {...p} size={H_CAP} />)}
          </div>
          <SectorLabels bestSector={bestSector} />
          <div style={{ ...band, flexDirection: 'column', padding: '4px 6px', background: RAIL_BG }}>
            {RIGHT_CAPS.map(n => <Pocket key={n} n={n} {...p} size={H_CAP} />)}
          </div>
        </div>

        <div style={{ ...band, padding: '5px 42px' }}>
          {BOT_ROW.map(n => <Pocket key={n} n={n} {...p} size={H_RAIL} />)}
        </div>
      </div>

      {/* ── Phones: vertical oval ── */}
      <div className="flex sm:hidden" style={{ borderRadius: 48, border: `2px solid ${OVAL_BORDER}`, background: RAIL_BG, overflow: 'hidden', alignItems: 'stretch' }}>
        <div style={{ ...band, flexDirection: 'column', alignItems: 'center', padding: '36px 5px' }}>
          {V_LEFT.map(n => <Pocket key={n} n={n} {...p} size={V_RAIL} />)}
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', background: INNER_BG,
          borderLeft: `1px solid ${OVAL_BORDER}`, borderRight: `1px solid ${OVAL_BORDER}`,
        }}>
          <div style={{ ...band, justifyContent: 'center', padding: '6px 4px', background: RAIL_BG, borderBottom: `1px solid ${OVAL_BORDER}` }}>
            {V_TOP_CAPS.map(n => <Pocket key={n} n={n} {...p} size={V_CAP} />)}
          </div>
          <SectorLabels bestSector={bestSector} vertical />
          <div style={{ ...band, justifyContent: 'center', padding: '6px 4px', background: RAIL_BG, borderTop: `1px solid ${OVAL_BORDER}` }}>
            {V_BOT_CAPS.map(n => <Pocket key={n} n={n} {...p} size={V_CAP} />)}
          </div>
        </div>

        <div style={{ ...band, flexDirection: 'column', alignItems: 'center', padding: '36px 5px' }}>
          {V_RIGHT.map(n => <Pocket key={n} n={n} {...p} size={V_RAIL} />)}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {SECTORS.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: s.color, fontWeight: 600, letterSpacing: '0.15em', fontFamily: 'monospace' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.color, display: 'inline-block', flexShrink: 0 }} />
            {s.label}{s.key === bestSector ? ' ▲' : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
