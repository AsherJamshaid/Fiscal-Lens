// Own the WASM module and its virtual filesystem outside the browser UI thread.
importScripts('levy_wasm.js', 'levy-wasm.js');

const methods = new Set(['init', 'live', 'backtest', 'report', 'arimaMean', 'arimaReport', 'generateForecastCol']);
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  // Serialize calls: initialization awaits fetches and the module shares C++ state.
  queue = queue.then(async () => {
    const { id, method, args } = data;
    try {
      if (!methods.has(method)) throw new Error('Unsupported model method: ' + method);
      const result = await LevyWasm[method](...args);
      self.postMessage({ id, result: method === 'init' ? true : result });
    } catch (error) {
      self.postMessage({ id, error: error.message || String(error) });
    }
  });
};
