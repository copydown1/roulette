export default function Header({ mode, onToggleMode }) {
  return (
    <header className="border-b border-border bg-panel px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-loss pulse-red flex-shrink-0" />
        <span className="font-bold tracking-wide2 uppercase text-gold text-sm sm:text-base truncate">
          Roulette Oracle
        </span>
      </div>

      <div className="flex rounded overflow-hidden border border-border text-xs font-semibold tracking-wide2 uppercase">
        <button
          onClick={() => mode !== 'history' && onToggleMode('history')}
          className={`px-3 py-1.5 transition-colors ${
            mode === 'history' ? 'bg-gold text-bg' : 'bg-transparent text-label hover:text-white'
          }`}
        >
          History
        </button>
        <button
          onClick={() => mode !== 'live' && onToggleMode('live')}
          className={`px-3 py-1.5 transition-colors ${
            mode === 'live' ? 'bg-loss text-white' : 'bg-transparent text-label hover:text-white'
          }`}
        >
          Live
        </button>
      </div>
    </header>
  );
}
