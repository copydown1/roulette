import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, ImagePlus, X, Loader2 } from 'lucide-react';
import { readBoard, checkCell, alreadyRecorded } from '../lib/boardOcr';

const isPocket = t => /^\d{1,2}$/.test(t) && Number(t) <= 36;

export function BoardImportHint({ onFile }) {
  const fileRef = useRef(null);
  return (
    <div className="panel px-3 py-2.5 sm:px-4 flex items-center gap-3">
      <ClipboardPaste size={16} className="text-gold flex-shrink-0" />
      <p className="text-[11px] text-label flex-1 min-w-0">
        <span className="hidden sm:inline">Paste a screenshot of the results board (<kbd className="font-mono text-white/80">Ctrl+V</kbd>) to import its numbers.</span>
        <span className="sm:hidden">Import numbers from a results-board screenshot.</span>
      </p>
      <button onClick={() => fileRef.current?.click()} className="btn-ghost flex items-center gap-1 !px-2 !py-1 flex-shrink-0">
        <ImagePlus size={12} />
        <span className="text-[10px]">Choose image</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

const CELL_BG = { red: 'bg-pocket-red', green: 'bg-pocket-green', neutral: 'bg-pocket-black' };

export default function BoardImport({ file, existingNumbers, onImport, onClose }) {
  const [status, setStatus] = useState('reading');   // reading | ready | error
  const [message, setMessage] = useState('Starting…');
  const [rows, setRows] = useState([]);
  const [newestAt, setNewestAt] = useState('top-left');
  const [skipKnown, setSkipKnown] = useState(true);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    setStatus('reading');
    readBoard(file, m => {
      if (cancelled) return;
      setMessage(/load|initializ/i.test(m.status)
        ? 'Loading text recognition (first time only)…'
        : 'Reading numbers…');
    })
      .then(result => {
        if (cancelled) return;
        if (!result.rows.length) {
          setStatus('error');
          setMessage('No numbers found in that image. Try a tighter screenshot of just the results board.');
          return;
        }
        setRows(result.rows.map(r => r.map(c => ({ ...c, original: c.text }))));
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
        setMessage('Couldn’t load text recognition. It needs an internet connection the first time it runs.');
      });
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cells = rows.flat();
  const filled = cells.filter(c => c.text.trim() !== '');
  const invalid = filled.filter(c => !isPocket(c.text.trim())).length;
  const warnings = filled.filter(c => isPocket(c.text.trim()) && checkCell(c.text, c.colour, c.digits)).length;
  const skipped = cells.length - filled.length;

  // Board order → oldest first
  const visual = filled.filter(c => isPocket(c.text.trim())).map(c => Number(c.text.trim()));
  const chronological = newestAt === 'top-left' ? [...visual].reverse() : visual;
  const known = alreadyRecorded(existingNumbers, chronological);
  const toAdd = skipKnown ? chronological.slice(known) : chronological;

  function edit(ri, ci, value) {
    setRows(prev => prev.map((r, i) => (i !== ri ? r : r.map((c, j) => (j !== ci ? c : { ...c, text: value.replace(/\D/g, '').slice(0, 2) })))));
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 overflow-y-auto" onClick={onClose}>
      <div className="panel w-full max-w-3xl p-4 space-y-4 my-auto" onClick={e => e.stopPropagation()} role="dialog" aria-label="Import round history">
        <div className="flex items-center justify-between">
          <p className="section-label !mb-0">Import round history</p>
          <button onClick={onClose} className="text-label hover:text-white" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-56 flex-shrink-0">
            {imageUrl && <img src={imageUrl} alt="Pasted results board" className="w-full rounded-lg border border-white/10" />}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            {status !== 'ready' ? (
              <div className={`flex items-center gap-2 text-[11px] ${status === 'error' ? 'text-red-300' : 'text-label'}`}>
                {status === 'reading' && <Loader2 size={14} className="animate-spin text-gold" />}
                {message}
              </div>
            ) : (
              <>
                <p className="text-[11px] text-label leading-relaxed">
                  Read <span className="text-white font-semibold">{cells.length}</span> numbers.
                  {' '}Check them against the screenshot — tap a cell to fix it, or clear it to skip it.
                </p>

                <div className="space-y-1">
                  {rows.map((row, ri) => (
                    <div
                      key={ri}
                      className="grid gap-1"
                      style={{ gridTemplateColumns: `repeat(${Math.max(...rows.map(r => r.length))}, minmax(0, 2.5rem))` }}
                    >
                      {row.map((c, ci) => {
                        const t = c.text.trim();
                        const problem = t === '' ? 'Empty — will be skipped' : checkCell(t, c.colour, c.digits);
                        const bad = t !== '' && !isPocket(t);
                        return (
                          <input
                            key={ci}
                            value={c.text}
                            onChange={e => edit(ri, ci, e.target.value)}
                            inputMode="numeric"
                            title={problem ?? (c.text !== c.original ? `Changed from ${c.original || 'nothing'}` : undefined)}
                            aria-label={`Row ${ri + 1}, number ${ci + 1}`}
                            className={`w-full min-w-0 h-8 px-0 rounded text-center font-mono font-bold text-xs text-white outline-none
                              focus:ring-2 focus:ring-white ${CELL_BG[c.colour] ?? 'bg-pocket-black'}
                              ${bad ? 'ring-2 ring-loss' : problem && t !== '' ? 'ring-2 ring-gold' : ''}
                              ${t === '' ? 'opacity-50 border border-dashed border-white/50' : ''}
                              ${c.text !== c.original ? 'underline decoration-white/60' : ''}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="text-[10px] font-mono space-y-0.5">
                  {invalid > 0 && <p className="text-red-300">{invalid} cell{invalid > 1 ? 's aren’t' : ' isn’t'} a roulette number (red outline) — fix or clear before importing.</p>}
                  {warnings > 0 && <p className="text-gold">{warnings} cell{warnings > 1 ? 's' : ''} may be misread (gold outline) — hover or tap to see why.</p>}
                  {skipped > 0 && <p className="text-muted">{skipped} empty cell{skipped > 1 ? 's' : ''} will be skipped.</p>}
                  {invalid === 0 && warnings === 0 && <p className="text-win">Every number matches its colour on the board.</p>}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-label">
                    <span className="tracking-wide2 uppercase">Newest is</span>
                    <div className="flex p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      {[['top-left', 'Top-left'], ['bottom-right', 'Bottom-right']].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setNewestAt(key)}
                          className={`px-2 py-1 rounded-md ${newestAt === key ? 'bg-gold text-bg font-semibold' : 'hover:text-white'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {known > 0 && (
                    <label className="flex items-center gap-1.5 text-[10px] text-label cursor-pointer">
                      <input type="checkbox" checked={skipKnown} onChange={e => setSkipKnown(e.target.checked)} className="accent-[#e6b450]" />
                      Skip the oldest {known} — they match your last recorded spins
                    </label>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.05]">
          <button onClick={onClose} className="btn-ghost !py-1.5 text-[11px]">Cancel</button>
          <button
            onClick={() => onImport(toAdd)}
            disabled={status !== 'ready' || invalid > 0 || toAdd.length === 0}
            className="btn-gold !py-1.5 text-[11px] disabled:opacity-40 disabled:pointer-events-none"
          >
            {status === 'ready' && toAdd.length === 0 ? 'Nothing new to import' : `Import ${status === 'ready' ? toAdd.length : ''} spins`}
          </button>
        </div>
      </div>
    </div>
  );
}
