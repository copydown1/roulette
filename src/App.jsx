import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSpins } from './hooks/useSpins';
import { computePrediction, getPredictedSet, computeWeights } from './lib/prediction';
import { getBetParams, computeDose, affordableDose, computeNet, computeYield, computeStats } from './lib/bankroll';
import { downloadSpins, parseSpins } from './lib/backup';

import Header from './components/Header';
import BetModeTabs from './components/BetModeTabs';
import NumberGrid from './components/NumberGrid';
import RacetrackGrid from './components/RacetrackGrid';
import RouletteTable from './components/RouletteTable';
import PredictionBar from './components/PredictionBar';
import RecentSpins from './components/RecentSpins';
import BloodMoneyPanel from './components/BloodMoneyPanel';
import TableSettings from './components/TableSettings';
import MissionReport from './components/MissionReport';
import SignalCalibration from './components/SignalCalibration';

const LS_MODE     = 'ro_mode';
const LS_BETMODE  = 'ro_betMode';
const LS_SETTINGS = 'ro_settings';

const DEFAULT_SETTINGS = { baseBet: 0.10, payout: 35, bankroll: 100 };

function loadLS(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
}
function saveLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export default function App() {
  const { spins, addSpin, undoLast, resetSession, replaceSpins } = useSpins();

  const [mode, setMode]         = useState(() => loadLS(LS_MODE, 'history'));
  const [betMode, setBetMode]   = useState(() => loadLS(LS_BETMODE, 'numbers'));
  const [settings, setSettings] = useState(() => loadLS(LS_SETTINGS, DEFAULT_SETTINGS));

  useEffect(() => saveLS(LS_MODE, mode),         [mode]);
  useEffect(() => saveLS(LS_BETMODE, betMode),   [betMode]);
  useEffect(() => saveLS(LS_SETTINGS, settings), [settings]);

  // ── Prediction ────────────────────────────────────────────────────────────────
  const predResult   = useMemo(() => computePrediction(spins, betMode), [spins, betMode]);
  const predictedSet = useMemo(() => getPredictedSet(predResult), [predResult]);
  const weights      = useMemo(
    () => predResult?.weights ?? computeWeights(spins, betMode),
    [predResult, spins, betMode]
  );

  // ── Bankroll math ─────────────────────────────────────────────────────────────
  // Global P&L across all bet modes — carries over when switching modes
  const totalYield = useMemo(() => computeYield(spins), [spins]);

  const { n: betN, payout: betPayout } = useMemo(
    () => getBetParams(betMode, predictedSet, settings.payout),
    [betMode, predictedSet, settings.payout]
  );

  const wantedDose = useMemo(
    () => computeDose(totalYield, settings.baseBet, betN, betPayout),
    [totalYield, settings.baseBet, betN, betPayout]
  );
  const bankrollLeft  = settings.bankroll + totalYield;
  const dose          = affordableDose(wantedDose, bankrollLeft, betN);
  const hasPrediction = predictedSet.size > 0;
  const canBet        = hasPrediction && dose > 0;

  // ── Per-mode stats ─────────────────────────────────────────────────────────────
  const allStats = useMemo(() => {
    const modes = ['numbers', 'sectors', 'dozens', 'columns'];
    return Object.fromEntries(modes.map(m => [m, computeStats(spins, m)]));
  }, [spins]);

  // ── Spin handler ──────────────────────────────────────────────────────────────
  const handleSpin = useCallback((number) => {
    // No prediction yet or no bankroll left: record the number without a bet
    if (mode !== 'live' || !canBet) {
      addSpin({ number, mode, betMode });
      return;
    }
    const isHit = predictedSet.has(number);
    const net   = computeNet(isHit, dose, betN, betPayout);
    addSpin({ number, win: isHit, net, dose, predicted: [...predictedSet], mode: 'live', betMode });
  }, [mode, canBet, addSpin, betMode, predictedSet, dose, betN, betPayout]);

  const handleExport = useCallback(() => downloadSpins(spins), [spins]);

  const handleImport = useCallback(async (file) => {
    try {
      const list = parseSpins(await file.text());
      if (!window.confirm(`Replace your ${spins.length} saved spins with the ${list.length} in this file?`)) return;
      replaceSpins(list);
    } catch (e) {
      window.alert(e.message);
    }
  }, [spins.length, replaceSpins]);

  const lastNumber = spins.length ? spins[spins.length - 1].number : null;

  // ── Entry surface by bet mode ─────────────────────────────────────────────────
  const entrySurface = betMode === 'sectors'
    ? <RacetrackGrid predictedSet={predictedSet} lastNumber={lastNumber} onSpin={handleSpin} />
    : betMode === 'dozens' || betMode === 'columns'
    ? <RouletteTable predictedSet={predictedSet} lastNumber={lastNumber} onSpin={handleSpin} betMode={betMode} predResult={predResult} />
    : <NumberGrid predictedSet={predictedSet} lastNumber={lastNumber} onSpin={handleSpin} />;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-white/[0.06]">
        <Header mode={mode} onToggleMode={setMode} />
        <BetModeTabs active={betMode} onChange={setBetMode} />
      </div>

      <main className="flex-1 p-3 sm:p-4">
        <div className="max-w-7xl mx-auto flex gap-4">

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
            {entrySurface}

            <RecentSpins spins={spins} />

            <PredictionBar
              predResult={predResult}
              betMode={betMode}
              spinCount={spins.length}
            />

            <BloodMoneyPanel
              dose={dose}
              wantedDose={wantedDose}
              hasPrediction={hasPrediction}
              totalYield={totalYield}
              bankroll={settings.bankroll}
              n={betN}
              payout={betPayout}
              mode={mode}
            />

            <TableSettings settings={settings} onChange={setSettings} betMode={betMode} />
          </div>

          {/* ── Sidebar (desktop) ── */}
          <div className="hidden lg:flex flex-col gap-3 w-[340px] flex-shrink-0">
            <MissionReport
              allStats={allStats}
              activeBetMode={betMode}
              totalSpins={spins.length}
              onUndo={undoLast}
              onReset={resetSession}
              onExport={handleExport}
              onImport={handleImport}
            />
            <SignalCalibration weights={weights} spinCount={spins.length} />
          </div>
        </div>

        {/* Mobile sidebar */}
        <div className="lg:hidden mt-3 space-y-3 max-w-7xl mx-auto">
          <MissionReport
            allStats={allStats}
            activeBetMode={betMode}
            totalSpins={spins.length}
            onUndo={undoLast}
            onReset={resetSession}
            onExport={handleExport}
            onImport={handleImport}
          />
          <SignalCalibration weights={weights} spinCount={spins.length} />
        </div>
      </main>

      <footer className="border-t border-border px-4 py-3 text-center">
        <p className="text-[10px] text-muted max-w-xl mx-auto">
          Every spin is independent. No algorithm guarantees an outcome. For entertainment analysis only.
        </p>
      </footer>
    </div>
  );
}
