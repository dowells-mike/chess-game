// Standard Emscripten pthread worker for threaded Stockfish build.
// This is the exact worker script that the main thread expects.

var Module = {};

onmessage = function(e) {
  try {
    if (e.data.cmd === 'load') {
      // Load the main script
      Module['mainScriptUrlOrBlob'] = e.data.urlOrBlob;
      Module['wasmMemory'] = e.data.wasmMemory;
      Module['wasmModule'] = e.data.wasmModule;
      Module['ENVIRONMENT_IS_PTHREAD'] = true;
      
      // Import the main Stockfish script which will set up the pthread
      importScripts(e.data.urlOrBlob);
      
      // Signal that worker is loaded
      postMessage({ cmd: 'loaded' });
    } else {
      // Pass other messages to the loaded Module
      if (Module.PThread && Module.PThread.receiveObjectTransfer) {
        Module.PThread.receiveObjectTransfer(e.data);
      }
    }
  } catch (err) {
    console.error('pthread worker error:', err);
    postMessage({ cmd: 'error', error: err.message });
  }
};
