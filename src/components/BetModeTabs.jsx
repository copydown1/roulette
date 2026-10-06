import { Hash, CircleDot, Rows3, Columns3 } from 'lucide-react';

const TABS = [
  { key: 'numbers', label: 'Numbers', Icon: Hash },
  { key: 'sectors', label: 'Sectors', Icon: CircleDot },
  { key: 'dozens',  label: 'Dozens',  Icon: Rows3 },
  { key: 'columns', label: 'Columns', Icon: Columns3 },
];

export default function BetModeTabs({ active, onChange }) {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-3">
      <div className="grid grid-cols-4 sm:inline-grid gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {TABS.map(({ key, label, Icon }) => {
          const on = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-pressed={on}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5
                px-1 sm:px-4 py-1.5 sm:py-2 rounded-lg
                text-[10px] sm:text-[11px] font-semibold tracking-wider sm:tracking-wide2 uppercase transition-all
                ${on
                  ? 'bg-gold text-bg shadow-[0_4px_14px_-4px_rgba(230,180,80,0.6)]'
                  : 'text-label hover:text-white hover:bg-white/[0.04]'}`}
            >
              <Icon size={14} strokeWidth={2.5} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
