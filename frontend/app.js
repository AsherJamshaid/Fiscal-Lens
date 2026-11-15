// DEBUG: replacement app.js. Existing CSS and HTML IDs are preserved.
// DEBUG: requires the existing LevyWasm wrapper and its compiled .wasm file.
(() => {
'use strict';
function boot() {
  // DEBUG: protect against duplicate script tags and initialize only after DOM parsing.
  if (window.__fiscalLensBooted) return;
  window.__fiscalLensBooted = true;
const $ = id => document.getElementById(id);
const number = v => v == null ? '—' : new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(v);

let HISTORY = [];
let LEVY_RESULT = null;
let BRENT_PRICES = [];
let USD_PRICES = [];

// DEBUG: quoted CSV fields, CRLF, BOM and tab-separated files are supported.
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  if (/^\s*</.test(text)) throw new Error('Received HTML instead of CSV.');
  const delimiter = text.split(/\r?\n/, 1)[0].includes('\t') ? '\t' : ',';
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === delimiter && !quoted) { row.push(field.trim()); field = ''; }
    else if (c === '\n' && !quoted) {
      row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
      row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift() || [];
  return rows.map(cols => Object.fromEntries(headers.map((h, i) => [h, cols[i] || ''])));
}
async function loadCSV(paths, columns) {
  const failures = [];
  for (const path of paths) {
    try {
      const res = await fetch(path, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = parseCSV(await res.text());
      if (!rows.length || !columns.some(key => key in rows[0])) throw new Error('Missing rows or required columns');
      return rows;
    } catch (error) { failures.push(path + ': ' + error.message); }
  }
  throw new Error(failures.join('; '));
}

const themeBtn = $('theme-toggle');
function setTheme(t, animate) {
  const apply = () => {
    document.documentElement.dataset.theme = t;
    const themeAction = t === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', themeAction);
      themeBtn.title = themeAction;
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    }
    try { localStorage.setItem('theme', t); } catch (e) {}
  };
  if (animate && document.startViewTransition) document.startViewTransition(apply); else apply();
}
if (themeBtn) {
  themeBtn.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true));
}
setTheme(document.documentElement.dataset.theme || 'dark');

const navLinks = [...document.querySelectorAll('.nav a')];
function updateNavigation() {
  if (!navLinks.length) return;
  let current = navLinks.at(0);
  navLinks.forEach(link => {
    const section = document.querySelector(link.getAttribute('href'));
    if (section && section.getBoundingClientRect().top <= 160) current = link;
  });
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3) current = navLinks.at(-1);
  navLinks.forEach(link => {
    const active = link === current;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
let navigationPending = false;
window.addEventListener('scroll', () => {
  if (navigationPending) return;
  navigationPending = true;
  requestAnimationFrame(() => { updateNavigation(); navigationPending = false; });
}, { passive: true });
window.addEventListener('resize', updateNavigation);
updateNavigation();

function renderLevyResult() {
  const result = LEVY_RESULT;
  const metric = value => Number.isFinite(value) ? number(value) : '—';
  const date = value => value ? new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(value + 'T00:00:00Z')) : '—';
  message('levyValue', metric(result?.levy));
  message('levyRequired', metric(result?.requiredLevy));
  message('levyMultiplier', Number.isFinite(result?.multiplier)
    ? new Intl.NumberFormat('en-PK', { maximumFractionDigits: 3 }).format(result.multiplier) + '×' : '—');
  message('levyCurrent', metric(result?.currentLevy));
  const difference = result && Number.isFinite(result.currentLevy) ? result.levy - result.currentLevy : null;
  message('levyDifference', Number.isFinite(difference) ? (difference > 0 ? '+' : '') + number(difference) : '—');
  message('levyCrude', metric(result?.crude));
  message('levyPeriodStart', date(result?.periodStart));
  message('levyPeriodEnd', date(result?.periodEnd));
  message('levyRecommendationNote', result
    ? 'Regression-tree recommendation for ' + date(result.periodStart) + ' to ' + date(result.periodEnd) + '.'
    : 'Run the recommendation to view.');
}
renderLevyResult();

// DEBUG: index.html is in frontend; ../data/ accesses the sibling data folder.
// DEBUG: each dataset has its own cache. Failed requests can be retried on the next click.
const dataTasks = new Map();
function dataset(key, work) {
  if (!dataTasks.has(key)) {
    dataTasks.set(key, work().catch(error => {
      dataTasks.delete(key);
      throw error;
    }));
  }
  return dataTasks.get(key);
}
function ensureBrent() {
  return dataset('brent', async () => {
    const rows = await loadCSV(
      ['../data/processed/brent_daily.csv', '../data/raw/brent_daily.csv'], ['price', 'close']);
    rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const valid = rows.map(row => ({ row, value: Number(row.price ?? row.close) }))
      .filter(item => Number.isFinite(item.value) && item.value > 0);
    if (!valid.length) throw new Error('Brent CSV contains no positive prices.');
    BRENT_PRICES = valid.map(item => item.value);
  });
}
function ensureUsd() {
  return dataset('usd', async () => {
    const rows = await loadCSV(['../data/raw/usd_pkr_daily.csv'], ['usd_pkr']);
    rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    USD_PRICES = rows.map(row => Number(row.usd_pkr)).filter(value => Number.isFinite(value) && value > 0);
    if (!USD_PRICES.length) throw new Error('USD / PKR CSV contains no positive rates.');
  });
}
function ensureTraining() {
  // DEBUG: only non-Brent tracker inputs need this frontend dataset.
  // A filename with a space is supported as well as levy_training.csv.
  return dataset('training', async () => {
    HISTORY = await loadCSV([
      '../data/processed/levy_training.csv', '../data/levy_training.csv',
      '../data/processed/levy training.csv', '../data/levy training.csv'
    ], ['usd_pkr', 'retail_petrol_price']);
    HISTORY.sort((a, b) => String(a.period_start || '').localeCompare(String(b.period_start || '')));
  });
}

// Reveal static sections once; result updates must not hide content again.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
const io = new IntersectionObserver(entries => entries.forEach(e => {
if (e.intersectionRatio >= .12) {
e.target.classList.add('is-visible');
io.unobserve(e.target);
}
}), { threshold: [0, .12] });
document.querySelectorAll('.hero-banner,.hero-modules .module-card,.section-head,.panel').forEach(el => {
el.classList.add('reveal');
el.style.transitionDelay = Math.min([...el.parentElement.children].indexOf(el), 4) * 80 + 'ms';
io.observe(el);
});
}
// Cursor-following glow
const GLOW_SEL = '.btn,.module-card,.nav a,.theme-toggle';
const moveGlow = e => {
const el = e.target.closest && e.target.closest(GLOW_SEL);
if (!el) return;
const r = el.getBoundingClientRect();
el.style.setProperty('--mx', e.clientX - r.left + 'px');
el.style.setProperty('--my', e.clientY - r.top + 'px');
};
document.addEventListener('pointermove', moveGlow, { passive: true });
document.addEventListener('pointerover', moveGlow, { passive: true });
function message(id, text) { if ($(id)) $(id).textContent = text; }
function show(id, visible) { if ($(id)) $(id).hidden = !visible; }
function reportError(id, error) {
  console.error('[DEBUG]', error);
  message(id, 'Error: ' + (error.message || String(error)));
}
// DEBUG: reuse the existing wrapper contract. Do not invent C++ exports.
async function backend(methods) {
  const api = typeof LevyWasm !== 'undefined' ? LevyWasm : window.LevyWasm;
  if (!api) throw new Error('LevyWasm is missing. Load levy-wasm.js before app.js.');
  if (api.ready && typeof api.ready.then === 'function') await api.ready;
  for (const method of methods) {
    if (typeof api[method] !== 'function') throw new Error('LevyWasm.' + method + '() is missing from levy-wasm.js.');
  }
  return api;
}
function resultObject(result) {
  return typeof result === 'string' ? JSON.parse(result) : result;
}
let busy = false;
let lastForecast = null;
function setBusy(value, panelId) {
  busy = value;
  // DEBUG: serialize WASM calls because the same module may have shared C++ state.
  for (const id of ['runForecast', 'runLevy', 'window']) if ($(id)) $(id).disabled = value;
  if ($(panelId)) $(panelId).setAttribute('aria-busy', String(value));
}
const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
// ADDED: fixed forecast window (15 daily observations) and per-step pacing.
const FORECAST_HORIZON = 15;
const STEP_DELAY = 800; // ms: minimum time each step stays "running" (raise/lower to taste)
const FORECAST_STEPS = ['Load Brent history', 'Start C++ model', 'Forecast crude price (ARIMA)'];
const STEP_LABEL = { pending: 'Pending', running: 'Running…', done: 'Done', failed: 'Failed' };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
// Build the full list up front, every step "pending"; returns the <li> elements in order.
function initSteps(id, labels) {
  const list = $(id); if (!list) return [];
  const items = labels.map(text => {
    const li = document.createElement('li');
    const name = document.createElement('span'), state = document.createElement('span');
    name.textContent = text; li.append(name, state);
    setStep(li, 'pending');
    return li;
  });
  list.replaceChildren(...items);
  return items;
}
function setStep(li, state) {
  if (!li) return;
  li.dataset.state = state;
  li.lastElementChild.textContent = STEP_LABEL[state];
}
// running -> (real work + minimum delay) -> done, or failed if the work throws.
async function runStep(li, work) {
  setStep(li, 'running'); await paint();
  try {
    const [result] = await Promise.all([work(), wait(STEP_DELAY)]);
    setStep(li, 'done');
    return result;
  } catch (error) { setStep(li, 'failed'); throw error; }
}
function levySteps(states) {
  const list = $('levySteps'); if (!list) return;
  const labels = ['Load latest fortnight data', 'Calculate required levy', 'Walk the decision tree', 'Apply the multiplier'];
  list.replaceChildren(...labels.map((label, index) => {
    const item = document.createElement('li');
    item.dataset.state = states[index];
    const name = document.createElement('span'), status = document.createElement('span');
    name.textContent = (index + 1) + '. ' + label;
    status.textContent = { pending: 'Waiting', running: 'Running', done: 'Done', error: 'Failed' }[states[index]];
    item.append(name, status);
    return item;
  }));
}
function selectedSeries() {
  const key = $('forecastInput')?.value || 'forecast_crude_price';
  if (key === 'forecast_crude_price') return { values: BRENT_PRICES, label: 'Brent crude', unit: 'USD / bbl', period: 'daily observation' };
  const labels = { usd_pkr: ['USD / PKR', 'PKR / USD'], retail_petrol_price: ['Retail petrol', 'PKR / litre'] };
  if (!labels[key]) throw new Error('Unsupported input series: ' + key);
  const values = key === 'usd_pkr' ? USD_PRICES : HISTORY.map(row => Number(row[key])).filter(v => Number.isFinite(v) && v > 0);
  if (!values.length) throw new Error('No positive numeric values for ' + key + ' in levy_training.csv.');
  return { values, label: labels[key][0], unit: labels[key][1], period: key === 'usd_pkr' ? 'daily observation' : 'training dataset observation' };
}
// DEBUG: arimaMean returns ONE horizon mean, not a forecast trajectory.
// Plot history plus a labelled mean marker. Never fabricate future points or accuracy.
function drawForecast(series, horizon, mean) {
  const svg = $('forecastSvg'); if (!svg) return;
  const windowSize = Number($('window')?.value || 0);
  const history = windowSize > 0 ? series.values.slice(-windowSize) : series.values;
  const all = [...history, mean], min = Math.min(...all), max = Math.max(...all);
  const padding = (max - min) * .15 || Math.abs(max) * .05 || 1;
  const low = min - padding, high = max + padding;
  const x = i => 80 + i / Math.max(1, history.length - 1 + horizon) * 850;
  const y = v => 440 - (v - low) / (high - low) * 380;
  const ns = 'http://www.w3.org/2000/svg';
  const add = (tag, attrs, text) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    if (text !== undefined) el.textContent = text;
    svg.append(el); return el;
  };
  svg.replaceChildren();
  svg.setAttribute('aria-label', series.label + ': historical values and forecast horizon mean, ' + number(mean) + ' ' + series.unit);
  for (let i = 0; i <= 4; i++) {
    const v = low + (high - low) * i / 4;
    add('line', { x1: 80, x2: 930, y1: y(v), y2: y(v), stroke: 'currentColor', opacity: .15 });
    add('text', { x: 70, y: y(v) + 5, 'text-anchor': 'end', fill: 'currentColor', 'font-size': 16 }, number(v));
  }
  add('polyline', { points: history.map((v, i) => x(i) + ',' + y(v)).join(' '), fill: 'none', stroke: '#739aee', 'stroke-width': 3 });
  const end = x(history.length - 1 + horizon);
  add('circle', { cx: end, cy: y(mean), r: 7, fill: '#dcbf67' });
  add('text', { x: end, y: y(mean) - 18, 'text-anchor': 'end', fill: 'currentColor', 'font-size': 18 }, 'Horizon mean: ' + number(mean));
  add('text', { x: 80, y: 490, fill: 'currentColor', 'font-size': 17 }, 'History');
  add('text', { x: 930, y: 490, 'text-anchor': 'end', fill: 'currentColor', 'font-size': 17 }, 'Next ' + horizon + ' observations (mean)');
}
async function runForecast() {
  if (busy) return;
  lastForecast = null;
  setBusy(true, 'forecastPanel');
  show('chartProgress', true); show('forecastPlot', false); show('forecastLegend', false); show('chartIdle', false);
  show('modelInfo', false);
  message('runSummary', 'Loading inputs…');
  message('accuracyNote', 'Waiting for forecast evaluation…');
  for (const id of ['statMape', 'statRmse', 'statMae', 'statOrder', 'statDiff', 'statNext']) message(id, '—');
  const steps = initSteps('forecastSteps', FORECAST_STEPS);
  let ok = false;
  try {
    const horizon = FORECAST_HORIZON;
    let series, api, result, mean;
    // 1. Load Brent history (Brent never waits for or requests levy_training.csv)
    await runStep(steps[0], async () => { await ensureBrent(); series = selectedSeries(); });
    // 2. Start C++ model
    await runStep(steps[1], async () => { api = await backend(['arimaReport']); });
    // 3. Forecast crude price (ARIMA)
    message('runSummary', 'Calculating ' + series.label + '…');
    await runStep(steps[2], async () => {
      result = await api.arimaReport(series.values, horizon);
      if (!result.ok) throw new Error(result.error || 'ARIMA evaluation failed.');
      mean = Number(result.mean);
      if (!Number.isFinite(mean) || mean <= 0) throw new Error('C++ returned no valid forecast. Check the model’s minimum training length and the input data.');
    });
    await wait(500); // let the final "Done" register before the chart replaces the list
    lastForecast = { series, horizon, mean };
    drawForecast(series, horizon, mean);
    show('forecastPlot', true);
    message('forecastUnit', series.unit);
    message('runSummary', series.label + ': mean of the next ' + horizon + ' observations = ' + number(mean) + ' ' + series.unit + '. One observation = one ' + series.period + '.');
    message('statMape', number(result.mape) + '%');
    message('statRmse', number(result.rmse));
    message('statMae', number(result.mae));
    message('statOrder', result.p);
    message('statDiff', result.d);
    message('statNext', number(result.next));
    message('modelNote', 'Future forecast fitted on all ' + series.values.length + ' observations. Next observation: ' + series.unit + '.');
    show('modelInfo', true);
    message('accuracyNote', series.label + ': final ' + result.testCount + ' observations held out; fitted and selected p=' + result.evaluationP + ' using only the preceding ' + result.trainCount + '. MAPE is a percentage; RMSE and MAE are in ' + series.unit + '. Lower is better.');
    ok = true;
  } catch (error) { reportError('runSummary', error); message('accuracyNote', 'Evaluation unavailable: ' + error.message); }
  finally {
    // On success the chart replaces the step list; on failure the list stays so the failed step is visible.
    if (ok) show('chartProgress', false);
    setBusy(false, 'forecastPanel');
  }
}
async function runLevy() {
  if (busy) return;
  setBusy(true, 'levyPanel'); show('levyProgress', true); show('levyResult', true);
  LEVY_RESULT = null;
  renderLevyResult();
  levySteps(['running', 'pending', 'pending', 'pending']);
  message('levyRecommendationNote', 'Loading inputs…');
  const treeMetrics = { mae: 'treeMae', rmse: 'treeRmse', previousLevyBaseline: 'treePreviousBaseline', trainingMeanBaseline: 'treeMeanBaseline', currentLevyBaseline: 'treeCurrentBaseline', walkForwardRmse: 'treeWalkForward' };
  for (const id of Object.values(treeMetrics)) message(id, '—');
  message('treeNote', 'Waiting for model evaluation…');
  try {
    // DEBUG: live() owns C++ training-data loading; fetching a browser CSV does not mount it in WASM.
    await ensureBrent();
    if (!BRENT_PRICES.length) throw new Error('Brent price history is empty.');
    const api = await backend(['init', 'arimaMean', 'live']);
    await api.init();
    message('levyRecommendationNote', 'Preparing the crude forecast…'); await paint();
    const crude = Number(await api.arimaMean(BRENT_PRICES, 10));
    // DEBUG: no made-up fallback of $75 when C++ fails.
    if (!Number.isFinite(crude) || crude <= 0) throw new Error('C++ crude forecast failed. Check training data length.');
    // The advisor performs these three operations within one worker call.
    levySteps(['done', 'running', 'running', 'running']); await paint();
    const live = resultObject(await api.live(crude));
    if (!live || !live.ok) throw new Error(live?.error || 'C++ levy calculation failed. Check WASM CSV file mounting.');
    if (live.levy == null || live.levy === '' || !Number.isFinite(Number(live.levy)) || Number(live.levy) < 0) throw new Error('C++ returned an invalid levy.');
    levySteps(['done', 'done', 'done', 'done']); await paint();
    LEVY_RESULT = { ...live, levy: Number(live.levy), crude };
    renderLevyResult();
    // DEBUG: a report failure must not discard a successful recommendation.
    try {
      if (typeof api.report !== 'function') throw new Error('The WASM bridge does not expose report().');
      await paint();
      const report = resultObject(await api.report());
      if (!report?.ok) throw new Error(report?.error || 'C++ evaluation failed.');
      let count = 0;
      for (const [key, id] of Object.entries(treeMetrics)) {
        const value = report.metrics?.[key];
        if (Number.isFinite(value)) { message(id, number(value)); count++; }
      }
      message('treeNote', count === 6
        ? 'All errors are in PKR / litre; lower is better. Baselines use the same held-out test rows. Walk-forward uses training rows only.'
        : 'Some evaluation values are unavailable. Available errors are in PKR / litre; lower is better.');
    } catch (error) { reportError('treeNote', error); }
  } catch (error) {
    levySteps([...$('levySteps').children].map(item => item.dataset.state === 'running' ? 'error' : item.dataset.state));
    reportError('levyRecommendationNote', error);
  }
  finally { setBusy(false, 'levyPanel'); }
}
// DEBUG: attach the previously missing forecast handler and the recommendation handler.
$('runForecast')?.addEventListener('click', runForecast);
$('runLevy')?.addEventListener('click', runLevy);
$('window')?.addEventListener('change', () => {
  if (lastForecast) drawForecast(lastForecast.series, lastForecast.horizon, lastForecast.mean);
});
// DEBUG: opening HTML through file:// blocks browser CSV/WASM loading.
if (location.protocol === 'file:') {
  const error = new Error('Open this project through Live Server or http://localhost, not by double-clicking index.html.');
  reportError('runSummary', error); reportError('levyRecommendationNote', error);
} else {
  ensureBrent().catch(error => console.error('[DEBUG] Brent history:', error));
}

}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
})();
