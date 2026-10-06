import { Target } from 'lucide-react';

export default function Header({ mode, onToggleMode }) {
  const isLive = mode === 'live';
  return (
    <header className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                        bg-gradient-to-br from-gold/25 to-gold/5 border border-gold/30">
          <Target size={16} className="text-gold" />
          {isLive && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-loss pulse-red ring-2 ring-bg" />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-bold tracking-wider sm:tracking-wide2 uppercase text-gold text-xs sm:text-sm leading-tight truncate">
            Roulette Oracle
          </div>
          <div className="hidden sm:block text-[9px] tracking-wide2 uppercase text-muted leading-tight truncate">
            European · single zero
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] sm:text-[11px] font-semibold tracking-wider sm:tracking-wide2 uppercase">
        <button
          onClick={() => onToggleMode('history')}
          aria-pressed={!isLive}
          className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-colors ${
            !isLive ? 'bg-gold text-bg' : 'text-label hover:text-white'
          }`}
        >
          History
        </button>
        <button
          onClick={() => onToggleMode('live')}
          aria-pressed={isLive}
          className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
            isLive ? 'bg-loss text-white shadow-[0_4px_14px_-4px_rgba(197,58,58,0.7)]' : 'text-label hover:text-white'
          }`}
        >
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white pulse-red" />}
          Live
        </button>
      </div>
    </header>
  );
}
