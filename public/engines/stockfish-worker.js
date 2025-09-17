// Wrapper worker bridging module-style (pthreads) build and legacy API; provides single-thread fallback.

const FALLBACK_SINGLE_THREAD_URLS = [
  '/engines/stockfish-single.js', // optional self-host (place unthreaded build here if desired)
  'https://cdn.jsdelivr.net/npm/stockfish@16/stockfish.js',
  'https://cdn.jsdelivr.net/npm/stockfish@15/stockfish.js',
  'https://unpkg.com/stockfish@16/stockfish.js',
  'https://raw.githubusercontent.com/niklasf/stockfish.js/master/src/stockfish.js'
];

let instance = null;
let queue = [];
let failed = false;
let usingFallback = false;
let fallbackHandler = null;

const ENGINE_BASE_URL = self.location.href.replace(/[^\/]+$/, '');
function resolveEnginePath(path) {
  if (typeof path !== 'string' || path.startsWith('blob:') || path.startsWith('data:')) return path;
  if (/^(?:https?:)?\/\//.test(path)) return path;
  if (path.startsWith('/')) return path;
  return ENGINE_BASE_URL + path;
}
function createModuleOverrides() {
  return {
    mainScriptUrlOrBlob: resolveEnginePath('stockfish.js'),
    locateFile: (path) => resolveEnginePath(path)
  };
}

function postDebug(msg) { try { postMessage('[sf-worker] ' + msg); } catch(_){} }

async function loadThreadedModuleBuild() {
  const moduleOverrides = createModuleOverrides();
  // Load the pthreads-enabled wasm wrapper (expects SharedArrayBuffer / cross-origin isolation)
  self.Module = moduleOverrides;
  importScripts(resolveEnginePath('stockfish.js'));
  instance = await Stockfish(moduleOverrides);
  delete self.Module;
  instance.addMessageListener(line => { if (typeof line === 'string') postMessage(line); });
  queue.forEach(cmd => instance.postMessage(cmd));
  queue = [];
}

function tryFallbackSingleThread() {
  usingFallback = true;
  for (const url of FALLBACK_SINGLE_THREAD_URLS) {
    try {
      const priorHandler = onmessage;
      onmessage = null;
      importScripts(url); // legacy build exposes onmessage handler internally
      fallbackHandler = typeof onmessage === 'function' ? onmessage : null;
      onmessage = priorHandler;
      postDebug('fallback single-thread build loaded: ' + url);
      const backlog = queue;
      queue = [];
      // Flush any queued commands now that legacy worker is active.
      backlog.forEach(cmd => {
        if (fallbackHandler) {
          try { fallbackHandler.call(self, { data: cmd }); } catch (err) { postDebug('queued cmd dispatch error: ' + err); }
        } else {
          postDebug('no fallback handler yet; re-queueing command');
          queue.push(cmd);
        }
      });
      postDebug('fallback single-thread worker initialized');
      return true;
    } catch (e) {
      postDebug('fallback url failed: ' + url + ' -> ' + (e && e.message));
      continue;
    }
  }
  return false;
}

(async () => {
  try {
    const supportsThreads = typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined' && (self.crossOriginIsolated === true);
    if (!supportsThreads) {
      postDebug('SharedArrayBuffer unavailable; skipping threaded build');
      if (!tryFallbackSingleThread()) {
        failed = true; postMessage('engine-error fallback-all-failed');
      }
      return;
    }
    await loadThreadedModuleBuild();
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    if (/SharedArrayBuffer/.test(msg) || /pthread/i.test(msg)) {
      postDebug('Threaded build failed due to SAB/pthread issue: ' + msg);
      if (!tryFallbackSingleThread()) {
        failed = true; postMessage('engine-error fallback-all-failed ' + msg);
      }
      return;
    }
    // Other error: still attempt fallback
    if (!tryFallbackSingleThread()) {
      failed = true; postMessage('engine-error init ' + msg);
    }
  }
})();

onmessage = (e) => {
  if (failed) return;
  const cmd = e && e.data;
  if (instance && !usingFallback) {
    instance.postMessage(cmd);
    return;
  }
  if (usingFallback) {
    if (fallbackHandler) {
      try { fallbackHandler.call(self, { data: cmd }); } catch (err) { postDebug('fallback handler error: ' + err); }
    } else {
      queue.push(cmd);
    }
    return;
  }
  queue.push(cmd);
};
