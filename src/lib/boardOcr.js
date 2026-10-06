import { createWorker } from 'tesseract.js';
import { getColor } from './prediction';

// Reads a screenshot of a casino results board (a grid of coloured numbers) into rows of numbers.
// Everything runs in the browser; Tesseract downloads its model files once, then the browser caches them.

const TARGET_DIGIT_PX = 40;   // small board digits read far more reliably when enlarged

let workerPromise = null;
let onProgressCb = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, { logger: m => onProgressCb?.(m) })
      .then(async worker => {
        await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
        return worker;
      })
      .catch(err => { workerPromise = null; throw err; });
  }
  return workerPromise;
}

function otsu(values) {
  const hist = new Array(256).fill(0);
  values.forEach(v => hist[v]++);
  const total = values.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; threshold = t; }
  }
  return threshold;
}

const median = arr => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];

// Separates the numbers from the background. Works for dark boards (bright numbers) and light ones.
function prepare(bitmap) {
  const w = bitmap.width, h = bitmap.height;
  const src = document.createElement('canvas');
  src.width = w; src.height = h;
  const ctx = src.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;

  const maxC = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) maxC[i] = Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
  const darkBoard = median(maxC) < 128;

  // "Ink" = how much a pixel stands out from the background, 0–255
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    ink[i] = darkBoard ? maxC[i] : 255 - Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
  }
  const threshold = Math.min(170, Math.max(100, otsu(ink)));

  // Dark digits on white for the OCR. Kept greyscale (not pure black/white) so thin
  // strokes like "1" keep their anti-aliased edges; the background is flattened to white.
  const floor = threshold * 0.6;
  const grey = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = ink[i] <= floor ? 255 : Math.max(0, 255 - Math.round(((ink[i] - floor) / (255 - floor)) * 255 * 1.4));
    grey.data[i * 4] = grey.data[i * 4 + 1] = grey.data[i * 4 + 2] = v;
    grey.data[i * 4 + 3] = 255;
  }
  const clean = document.createElement('canvas');
  clean.width = w; clean.height = h;
  clean.getContext('2d').putImageData(grey, 0, 0);

  return { clean, px, ink, w, h, threshold, darkBoard };
}

// Connected blobs of ink pixels (8-connected) → bounding boxes
function findBlobs({ ink, w, h, threshold }) {
  const seen = new Uint8Array(w * h);
  const blobs = [];
  const stack = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || ink[start] <= threshold) continue;
    let x0 = w, x1 = 0, y0 = h, y1 = 0, area = 0;
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p - x) / w;
      area++;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (!seen[q] && ink[q] > threshold) { seen[q] = 1; stack.push(q); }
      }
    }
    blobs.push({ x0, x1: x1 + 1, y0, y1: y1 + 1, area });
  }
  return blobs;
}

// Keeps blobs shaped like digits and groups them into numbers, laid out in board rows
function findNumbers(blobs) {
  const candidates = blobs.filter(b => b.area >= 6 && b.y1 - b.y0 >= 5);
  if (!candidates.length) return [];
  const digitH = median(candidates.map(b => b.y1 - b.y0));
  // Width allows two digits that touch (common in bold board fonts)
  const digits = candidates.filter(b => {
    const bh = b.y1 - b.y0, bw = b.x1 - b.x0;
    return bh >= digitH * 0.7 && bh <= digitH * 1.4 && bw <= digitH * 2.4;
  });

  const cy = b => (b.y0 + b.y1) / 2;
  digits.sort((a, b) => cy(a) - cy(b));
  const rows = [];
  for (const d of digits) {
    const row = rows.at(-1);
    if (row && Math.abs(cy(d) - row.cy) < digitH * 0.5) {
      row.items.push(d);
      row.cy = row.items.reduce((s, x) => s + cy(x), 0) / row.items.length;
    } else rows.push({ cy: cy(d), items: [d] });
  }

  return rows.map(({ items }) => {
    items.sort((a, b) => a.x0 - b.x0);
    const nums = [];
    for (const d of items) {
      const cur = nums.at(-1);
      if (cur && d.x0 - cur.x1 < digitH * 0.45) {
        cur.x1 = Math.max(cur.x1, d.x1);
        cur.y0 = Math.min(cur.y0, d.y0);
        cur.y1 = Math.max(cur.y1, d.y1);
        cur.parts.push(d);
      } else nums.push({ ...d, parts: [d] });
    }
    return nums.map(n => ({ ...n, digitH }));
  });
}

// One box per digit. A blob wider than a single digit is two touching digits (e.g. "17"),
// split at the column with the least ink near its middle.
function digitBoxes({ ink, w, threshold }, num) {
  const out = [];
  for (const p of num.parts) {
    const pw = p.x1 - p.x0;
    if (pw <= num.digitH * 0.95) { out.push(p); continue; }
    let best = -1, bestInk = Infinity;
    for (let x = Math.round(p.x0 + pw * 0.3); x <= Math.round(p.x0 + pw * 0.7); x++) {
      let colInk = 0;
      for (let y = p.y0; y < p.y1; y++) if (ink[y * w + x] > threshold) colInk++;
      const centred = colInk + Math.abs(x - (p.x0 + pw / 2)) * 0.01;
      if (centred < bestInk) { bestInk = centred; best = x; }
    }
    out.push({ ...p, x1: best }, { ...p, x0: best });
  }
  return out;
}

// Single box → its own clean, enlarged canvas
function cropCanvas(prep, b) {
  const bh = b.y1 - b.y0;
  const scale = Math.max(2, Math.min(8, Math.round(TARGET_DIGIT_PX / bh)));
  const pad = Math.ceil(bh * 0.8);
  const sw = b.x1 - b.x0 + 2, sh = bh + 2;
  const canvas = document.createElement('canvas');
  canvas.width = (sw + pad * 2) * scale;
  canvas.height = (sh + pad * 2) * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(prep.clean, b.x0 - 1, b.y0 - 1, sw, sh, pad * scale, pad * scale, sw * scale, sh * scale);
  return canvas;
}

// Copies every box into its own row of a tall, clean image, so the OCR reads one item per line.
// Items are enlarged to ~40px tall, the size Tesseract reads best.
function stackBoxes(prep, boxes) {
  const maxW = Math.max(...boxes.map(b => b.x1 - b.x0));
  const maxH = Math.max(...boxes.map(b => b.y1 - b.y0));
  const scale = Math.max(2, Math.min(8, Math.round(TARGET_DIGIT_PX / maxH)));
  const pad = Math.ceil(maxH * 0.8);
  const slotH = (maxH + pad * 2) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = (maxW + pad * 2) * scale;
  canvas.height = slotH * boxes.length;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  boxes.forEach((b, k) => {
    const sw = b.x1 - b.x0 + 2, sh = b.y1 - b.y0 + 2;
    ctx.drawImage(prep.clean, b.x0 - 1, b.y0 - 1, sw, sh,
      pad * scale, k * slotH + (pad + (maxH - (b.y1 - b.y0)) / 2) * scale, sw * scale, sh * scale);
  });
  return { canvas, slotH };
}

// Average colour of a number's own pixels → 'red' | 'green' | 'neutral' (black numbers)
function textColour({ px, ink, w, h, threshold }, box) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = Math.max(0, Math.floor(box.y0)); y < Math.min(h, Math.ceil(box.y1)); y++) {
    for (let x = Math.max(0, Math.floor(box.x0)); x < Math.min(w, Math.ceil(box.x1)); x++) {
      const i = y * w + x;
      if (ink[i] <= threshold) continue;
      r += px[i * 4]; g += px[i * 4 + 1]; b += px[i * 4 + 2]; n++;
    }
  }
  if (!n) return 'neutral';
  r /= n; g /= n; b /= n;
  if (r > g * 1.6 && r > b * 1.6) return 'red';
  if (g > r * 1.3 && g > b * 1.15) return 'green';
  return 'neutral';
}

const EXPECTED_COLOUR = { red: 'red', green: 'green', black: 'neutral' };

// Problem with a cell's value given how it looked on the board, or null. Empty = skipped, not a problem.
export function checkCell(text, colour, digits) {
  const t = text.trim();
  if (t === '') return null;
  if (!/^\d{1,2}$/.test(t)) return 'Not a number';
  const n = Number(t);
  if (n > 36) return 'Not a roulette number';
  if (colour && EXPECTED_COLOUR[getColor(n)] !== colour) {
    return `Was ${colour === 'neutral' ? 'black/white' : colour} on the board, but ${n} is ${getColor(n)}`;
  }
  if (digits && t.length !== digits) return `The board shows ${digits} digit${digits > 1 ? 's' : ''} here`;
  return null;
}

// Where a board (oldest first) continues the spins already saved: the latest position p in `incoming`
// whose run back to the board's oldest number (or for 6+ spins) matches the end of `existing`.
// Returns how many of the board's oldest numbers are already recorded.
export function alreadyRecorded(existing, incoming) {
  let best = { p: -1, k: 0 };
  for (let p = incoming.length - 1; p >= 0; p--) {
    let k = 0;
    while (k <= p && k < existing.length && incoming[p - k] === existing[existing.length - 1 - k]) k++;
    if (k > best.k) best = { p, k };
  }
  const { p, k } = best;
  const trustworthy = k >= 3 && (k === p + 1 || k === existing.length || k >= 6);
  return trustworthy ? p + 1 : 0;
}

const CONFIDENT = 75;

// One OCR call over a stack of boxes → [{ text, conf }] per box (each Tesseract call has a fixed cost)
async function readStack(worker, prep, boxes) {
  await worker.setParameters({ tessedit_pageseg_mode: '6' });
  const { canvas, slotH } = stackBoxes(prep, boxes);
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  const reads = boxes.map(() => ({ text: '', conf: 100 }));
  for (const block of data.blocks ?? [])
    for (const para of block.paragraphs)
      for (const line of para.lines) {
        const read = reads[Math.floor(((line.bbox.y0 + line.bbox.y1) / 2) / slotH)];
        if (!read) continue;
        read.text += line.text.replace(/\D/g, '');
        read.conf = Math.min(read.conf, line.confidence);
      }
  return reads;
}

// Returns { rows: [[{ text, colour, confidence, digits }]] } in the board's visual order (top→bottom, left→right)
export async function readBoard(blob, onProgress) {
  onProgressCb = onProgress;
  try {
    const bitmap = await createImageBitmap(blob);
    const prep = prepare(bitmap);
    const rows = findNumbers(findBlobs(prep));
    const numbers = rows.flat();
    if (!numbers.length) return { rows: [] };

    const cells = numbers.map(b => {
      const digits = digitBoxes(prep, b);
      return {
        box: b,
        digitBoxes: digits,
        digits: digits.length,
        colour: textColour(prep, { x0: b.x0 - 1, x1: b.x1 + 1, y0: b.y0 - 1, y1: b.y1 + 1 }),
        text: '',
        confidence: 0,
      };
    });

    // Pass 1: every number at once, one per line
    const worker = await getWorker();
    const firstReads = await readStack(worker, prep, numbers);
    cells.forEach((c, i) => { c.text = firstReads[i].text; c.confidence = firstReads[i].conf; });

    // Pass 2: anything doubtful is re-read digit by digit (touching digits split apart),
    // all in one call, with single-character reads only for digits that call missed
    const doubtful = cells.filter(c => !c.text || c.confidence < CONFIDENT || checkCell(c.text, c.colour, c.digits));
    if (doubtful.length) {
      const digitJobs = doubtful.flatMap(c => c.digitBoxes.map(box => ({ c, box })));
      const digitReads = await readStack(worker, prep, digitJobs.map(j => j.box));
      const missed = digitReads.map((r, i) => (r.text.length === 1 ? null : i)).filter(i => i !== null);
      if (missed.length) {
        await worker.setParameters({ tessedit_pageseg_mode: '10' });   // single character
        for (const i of missed) {
          const { data } = await worker.recognize(cropCanvas(prep, digitJobs[i].box));
          digitReads[i] = { text: data.text.replace(/\D/g, '').slice(0, 1), conf: data.confidence };
        }
      }
      for (const c of doubtful) {
        const mine = digitJobs.map((j, i) => (j.c === c ? digitReads[i] : null)).filter(Boolean);
        const text = mine.map(r => r.text).join('');
        if (text.length === c.digits && (!c.text || !checkCell(text, c.colour, c.digits))) {
          c.text = text;
          c.confidence = Math.min(...mine.map(r => r.conf));
        }
      }
    }

    let k = 0;
    return {
      rechecked: doubtful.length,
      rows: rows.map(row => row.map(() => {
        const { text, colour, confidence, digits } = cells[k++];
        return { text, colour, confidence: text ? confidence : 0, digits };
      })),
    };
  } finally {
    onProgressCb = null;
  }
}
