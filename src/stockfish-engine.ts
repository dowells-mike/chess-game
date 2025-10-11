// Stockfish engine integration via CDN Worker (avoids bundler resolving 'stockfish' package)
// GPLv3 applies when enabling Stockfish. See README.

let engine: Worker | null = null;
let stockfishAvailable = true;
const listeners: ((line: string) => void)[] = [];
let ready = false;
let pendingReadyResolvers: (() => void)[] = [];

const DIRECT_ONLY_URL_CANDIDATES = ['/engines/stockfish-worker.js'];
const STOCKFISH_URL_CANDIDATES = [
  ...DIRECT_ONLY_URL_CANDIDATES,
  '/engines/stockfish.js', // local single-thread build (place lightweight stockfish.js here)
  'https://cdn.jsdelivr.net/npm/stockfish@16.1.0/stockfish.js',
  'https://cdn.jsdelivr.net/npm/stockfish@16/stockfish.js'
];

function init() {
  if (engine || !stockfishAvailable) return;
  if (typeof Worker === 'undefined') {
    console.error('Web Workers not supported. Stockfish disabled.');
    stockfishAvailable = false;
    return;
  }
  const tryDirect = () => {
    for (const url of STOCKFISH_URL_CANDIDATES) {
      try {
        engine = new Worker(url);
        console.log('Stockfish worker loaded (direct):', url);
        attachHandlers();
        send('uci');
        return true;
      } catch (e) {
        engine = null;
        continue; // try next url
      }
    }
    console.warn('All direct Stockfish worker URLs failed, attempting blob fallback sequence');
    return false;
  };
  const attachHandlers = () => {
    if (!engine) return;
    engine.onmessage = (e: MessageEvent) => {
      let line = '';
      const data: any = e.data;
      if (typeof data === 'string') {
        line = data;
      } else if (data && typeof data === 'object') {
        // Emscripten pthread / module variants sometimes send objects: {cmd:'print', text:'...'} or {text:'...'}
        if (typeof data.text === 'string') line = data.text;
        else if (data.cmd === 'print' && typeof data.text === 'string') line = data.text;
      }
      if (!line) {
        console.debug('[Stockfish raw]', data);
        return;
      }
      console.debug('[Stockfish<-]', line);
      if (line.startsWith('readyok')) {
        ready = true;
        pendingReadyResolvers.forEach(r => r());
        pendingReadyResolvers = [];
      } else if (line.startsWith('uciok')) {
        // After uciok request readiness
        send('isready');
      } else if (line.startsWith('engine-error')) {
        console.error('Stockfish engine runtime error:', line);
        stockfishAvailable = false;
        ready = false;
      }
      listeners.forEach(l => l(line));
    };
    engine.onerror = (err: ErrorEvent) => {
      console.error('Stockfish worker error event', err.message || err);
      stockfishAvailable = false;
    };
    engine.onmessageerror = (err) => {
      console.error('Stockfish worker message error', err);
    };
  };
  const tryBlob = async () => {
    for (const url of STOCKFISH_URL_CANDIDATES) {
      if (DIRECT_ONLY_URL_CANDIDATES.includes(url)) continue;
      try {
        const resp = await fetch(url, { cache: 'force-cache' });
        if (!resp.ok) { continue; }
        const js = await resp.text();
        const blob = new Blob([js], { type: 'application/javascript' });
        const objUrl = URL.createObjectURL(blob);
        try {
          engine = new Worker(objUrl);
          console.log('Stockfish worker loaded (blob):', url);
        } finally {
          setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
        }
        attachHandlers();
        send('uci');
        return;
      } catch (e) {
        engine = null;
        continue;
      }
    }
    console.error('All blob fallback attempts failed. Disabling Stockfish.');
    stockfishAvailable = false;
  };
  (async () => { if (!tryDirect()) await tryBlob(); })();
}

export function send(cmd: string) {
  init();
  if (!engine) return;
  engine.postMessage(cmd);
}

function waitReady(): Promise<void> {
  return new Promise(res => {
    if (ready) return res();
    if (!stockfishAvailable) return res();
    pendingReadyResolvers.push(res);
    send('isready');
  });
}

export interface StockfishTimeOptions {
  wtime: number; // ms
  btime: number; // ms
  winc: number; // ms
  binc: number; // ms
  movetime?: number;
  depth?: number;
}

export async function getBestMove(fen: string, opts: StockfishTimeOptions): Promise<string> {
  if (!stockfishAvailable) throw new Error('Stockfish unavailable');
  await waitReady();
  return new Promise<string>((resolve, reject) => {
    if (!stockfishAvailable) return reject('Stockfish unavailable');
    let settled = false;
    const timeoutMs = (opts.movetime || 1000) + 3000; // allow some buffer
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      removeListener(handler);
      reject(new Error('Stockfish bestmove timeout'));
    }, timeoutMs);
    const handler = (line: string) => {
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const move = parts[1];
        if (!settled) {
          settled = true;
            clearTimeout(timer);
          removeListener(handler);
          resolve(move);
        }
      }
    };
    addListener(handler);
    console.debug('[Stockfish->] position fen', fen);
    send('position fen ' + fen);
    if (opts.movetime) {
      console.debug('[Stockfish->] go movetime', opts.movetime);
      send(`go movetime ${opts.movetime}`);
    } else if (opts.depth) {
      console.debug('[Stockfish->] go depth', opts.depth);
      send(`go depth ${opts.depth}`);
    } else {
      console.debug('[Stockfish->] go wtime btime', opts.wtime, opts.btime);
      send(`go wtime ${opts.wtime} btime ${opts.btime} winc ${opts.winc} binc ${opts.binc}`);
    }
  });
}

function addListener(l: (line: string) => void) { listeners.push(l); }
function removeListener(l: (line: string) => void) { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); }

export default { send, getBestMove };