import { Fragment } from 'react';
import { User } from 'lucide-react';
import { getColor } from '../lib/prediction';

function Chip({ n, isWin, large, fade = 1 }) {
  const c = getColor(n);
  const base = c === 'red' ? 'bg-pocket-red' : c === 'black' ? 'bg-pocket-black border border-white/10' : 'bg-pocket-green';
  const ring = isWin === true ? 'ring-2 ring-win' : isWin === false ? 'ring-2 ring-loss/80' : '';
  const size = large ? 'w-12 h-12 text-lg' : 'w-8 h-8 text-xs';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold font-mono text-white flex-shrink-0 ${size} ${base} ${ring}`}
      style={{ opacity: fade }}
    >
      {n}
    </span>
  );
}

// Marks where the dealer changed: everything to its left was spun by the new dealer
const DealerDivider = () => (
  <span title="Dealer changed here" className="w-0.5 self-stretch rounded-full bg-gold/70 flex-shrink-0" />
);

export default function RecentSpins({ spins, dealerPending, onNewDealer }) {
  const recent = spins.slice(-15).reverse();
  if (!recent.length) return null;
  const [last, ...rest] = recent;
  const hasLive = recent.some(s => s.win != null);

  return (
    <div className="panel p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="section-label !mb-0">Recent Spins</p>
        <button
          onClick={onNewDealer}
          aria-pressed={dealerPending}
          className={`btn-ghost flex items-center gap-1 !px-2 !py-1 ${dealerPending ? '!bg-gold !border-gold !text-bg' : ''}`}
        >
          <User size={12} />
          <span className="text-[10px]">{dealerPending ? 'New dealer next' : 'New dealer'}</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1 flex-shrink-0 p-1">
          <Chip n={last.number} isWin={last.win} large />
          <span className="text-[8px] tracking-wide2 uppercase text-label">Last</span>
        </div>
        {rest.length > 0 && (last.newDealer ? <DealerDivider /> : <div className="w-px self-stretch bg-white/[0.06]" />)}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar p-1 min-w-0">
          {rest.map((s, i) => (
            <Fragment key={s.id ?? i}>
              <Chip n={s.number} isWin={s.win} fade={Math.max(0.35, 1 - i * 0.05)} />
              {s.newDealer && i < rest.length - 1 && <DealerDivider />}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-2 text-[9px] tracking-wide2 uppercase text-muted">
        {dealerPending ? (
          <span className="text-gold normal-case tracking-normal text-[10px]">
            Your next spin starts a new dealer — tap the button again to cancel.
          </span>
        ) : (
          <div className="flex items-center gap-3">
            {hasLive && (
              <>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full ring-2 ring-win" />Hit</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full ring-2 ring-loss/80" />Miss</span>
              </>
            )}
          </div>
        )}
        <span className="font-mono flex-shrink-0">{spins.length} total</span>
      </div>
    </div>
  );
}
