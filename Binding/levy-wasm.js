/* Browser calls run in levy-worker.js so model fitting cannot block the UI.
   The worker loads the Emscripten module before this bridge. */
const LevyWasm = (() => {
  const scriptURL = typeof document !== 'undefined' ? document.currentScript.src : self.location.href;
  if (typeof window !== 'undefined') {
    const workerURL = new URL('levy-worker.js', scriptURL);
    let worker = null, nextId = 0;
    const pending = new Map();
    function fail(error) {
      worker?.terminate();
      worker = null;
      for (const task of pending.values()) task.reject(error);
      pending.clear();
    }
    function call(method, args) {
      return new Promise((resolve, reject) => {
        if (!worker) {
          if (typeof Worker === 'undefined') {
            reject(new Error('This browser does not support background model calculations. Use a current browser.'));
            return;
          }
          worker = new Worker(workerURL);
          worker.onmessage = ({ data }) => {
            const task = pending.get(data.id);
            if (!task) return;
            pending.delete(data.id);
            if (data.error) task.reject(new Error(data.error));
            else task.resolve(data.result);
          };
          worker.onerror = event => {
            event.preventDefault();
            fail(new Error(event.message || 'The background model worker could not load.'));
          };
          worker.onmessageerror = () => fail(new Error('Could not read the background model result.'));
        }
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        try { worker.postMessage({ id, method, args }); }
        catch (error) { pending.delete(id); reject(error); }
      });
    }
    return Object.fromEntries(['init', 'live', 'backtest', 'report', 'arimaMean', 'arimaReport', 'generateForecastCol']
      .map(method => [method, (...args) => call(method, args)]));
  }
  const BASE_URL = new URL('../data/', scriptURL);
  // [file under BASE_URL, path inside the virtual "data/" folder]
  const DATA_FILES = [
    ['processed/levy_training.csv',                       'processed/levy_training.csv'],
    ['processed/brent_daily.csv',                         'processed/brent_daily.csv'],
  ];

  let mod = null, ready = null;

  // Your C++ opens both "../data/..." (tree) and "data/..." (forecast generator),
  // so each file is written to /work/data/... AND /data/... with cwd = /work.
  function mount(M, name, text) {
    for (const root of ['/work/data', '/data']) {
      const full = `${root}/${name}`;
      M.FS.mkdirTree(full.substring(0, full.lastIndexOf('/')));
      M.FS.writeFile(full, text);
    }
  }

  function init() {
    if (ready) return ready;
    ready = (async () => {
      const M = await createLevyModule();
      M.FS.mkdirTree('/work');
      M.FS.chdir('/work');
      await Promise.all(DATA_FILES.map(async ([url, name]) => {
        const r = await fetch(new URL(url, BASE_URL));
        if (!r.ok) throw new Error(`Could not load ${BASE_URL + url} (${r.status})`);
        mount(M, name, await r.text());
      }));
      mod = M;
      return M;
    })().catch(error => {
      ready = null;
      throw error;
    });
    return ready;
  }

  const pick = (re, s) => (s.match(re) || [])[1];

  function parseRecommendation(res) {
    const out = res.output;
    if (res.code !== 0) return { ok: false, error: out.trim(), output: out };
    const levy = parseFloat(pick(/Recommended levy:\s+(-?[\d.]+)/, out));
    const periodStart = pick(/(?:Period Start|Target Date):\s+(\S+)/, out);
    // Advisor targets are half-month periods, starting on the 1st or 16th.
    let periodEnd = null;
    if (/^\d{4}-\d{2}-(01|16)$/.test(periodStart || '')) {
      const [year, month, day] = periodStart.split('-').map(Number);
      periodEnd = new Date(Date.UTC(year, day === 1 ? month - 1 : month, day === 1 ? 15 : 0)).toISOString().slice(0, 10);
    }
    return {
      ok: Number.isFinite(levy),
      levy,
      currentLevy: parseFloat(pick(/current_levy\s+(-?[\d.]+)/, out)),
      multiplier: parseFloat(pick(/Predicted multiplier:\s+(-?[\d.]+)/, out)),
      requiredLevy: parseFloat(pick(/Required levy:\s+(-?[\d.]+)/, out)),
      periodStart,
      periodEnd,
      output: out,
    };
  }

  // Live recommendation for a forecast crude price (USD/bbl)
  async function live(crude) {
    const M = await init();
    return parseRecommendation(M.runLive(Number(crude)));
  }

  // Backtest a date that exists in levy_training.csv (YYYY-MM-DD)
  async function backtest(date) {
    const M = await init();
    return parseRecommendation(M.runBacktest(String(date)));
  }

  // Full text report (accuracy, baselines, learned tree)
  async function report() {
    const M = await init();
    const r = M.runReport();
    return { ok: r.code === 0, output: r.output };
  }

  // ARIMA mean forecast over the next nDays for an array of daily prices.
  // Returns -1 if there is too little history (< 250 points) or no model fits.
  async function arimaMean(prices, nDays = 10) {
    const M = await init();
    const v = new M.VectorDouble();
    try {
      for (const p of prices) v.push_back(p);
      return M.forecastMean(v, nDays);
    } finally { v.delete(); }
  }

  // Re-generates forecast_col.csv from brent_daily.csv. Slow (runs ARIMA per row).
  async function generateForecastCol() {
    const M = await init();
    const r = M.generateForecastCol();
    if (r.code !== 0) return { ok: false, log: r.output, rows: [] };
    const csv = M.FS.readFile('/work/data/processed/forecast_col.csv', { encoding: 'utf8' });
    const rows = csv.trim().split('\n').slice(1).map(l => {
      const [period_start, v] = l.split(',');
      return { period_start, forecast_crude_price: v === '' ? null : parseFloat(v) };
    });
    return { ok: true, csv, rows, log: r.output };
  }

  // Forecast plus metrics from a separate chronological holdout, in price units.
  async function arimaReport(prices, nDays = 12) {
    const M = await init();
    const v = new M.VectorDouble();
    try {
      for (const price of prices) v.push_back(price);
      return M.forecastWithEvaluation(v, nDays);
    } finally { v.delete(); }
  }
  return { init, live, backtest, report, arimaMean, arimaReport, generateForecastCol };
})();
