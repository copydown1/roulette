const TABS = [
  { key: 'numbers', label: 'Numbers' },
  { key: 'sectors', label: 'Sectors' },
  { key: 'dozens', label: 'Dozens' },
  { key: 'columns', label: 'Columns' },
];

export default function BetModeTabs({ active, onChange }) {
  return (
    <div className="flex border-b border-border bg-panel px-2">
      {TABS.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-2.5 text-xs font-semibold tracking-wide2 uppercase border-b-2 transition-colors
            ${active === t.key
              ? 'border-gold text-gold'
              : 'border-transparent text-label hover:text-white'
            }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
