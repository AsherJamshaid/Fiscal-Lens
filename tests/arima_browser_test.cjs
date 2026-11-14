// Requires Playwright and Microsoft Edge (or PLAYWRIGHT_CHANNEL=chrome).
// Run from the repository root: node tests/arima_browser_test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(filename, (error, bytes) => {
    if (error) { res.writeHead(404).end(); return; }
    const mime = { '.wasm': 'application/wasm', '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' };
    res.setHeader('Content-Type', mime[path.extname(filename)] || 'application/octet-stream');
    res.end(bytes);
  });
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors = [], workers = [];
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    page.on('pageerror', error => errors.push(error.message));
    page.on('worker', worker => workers.push(worker));
    await page.goto(`http://127.0.0.1:${server.address().port}/frontend/index.html`);
    assert.equal(workers.length, 0, 'Model engine should not start during page loading');
    const panel = page.locator('.panel').first();
    await panel.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.panel').classList.contains('is-visible'));
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, document.body.scrollHeight);
    });
    // Allow IntersectionObserver to deliver the offscreen notification.
    await page.waitForFunction(() => document.querySelector('.panel').getBoundingClientRect().bottom < 0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert(await panel.evaluate(el => el.classList.contains('is-visible')), 'Revealed sections must stay visible after scrolling away');
    await page.locator('#runForecast').click();
    await page.waitForFunction(() => !document.getElementById('runForecast').disabled);
    assert.match(await page.locator('#runSummary').innerText(), /mean of the next 15/);
    assert.equal(await page.locator('#forecastInput, #forecastHorizon').count(), 0, 'Preserve the pulled tracker without the removed selectors');
    assert.equal(workers.length, 1);
    assert.notEqual(await page.locator('#statMape').innerText(), '—');

    // After initialization, timers must keep running during repeated model fits.
    const check = await page.evaluate(async () => {
      const rows = (await (await fetch('../data/processed/brent_daily.csv')).text()).trim().split(/\r?\n/);
      rows.shift();
      const prices = rows.map(row => Number(row.split(',')[1]));
      let ticks = 0;
      const timer = setInterval(() => ticks++, 10);
      try {
        const results = await Promise.all([LevyWasm.arimaReport(prices, 12), LevyWasm.arimaReport(prices, 24)]);
        return { ticks, results };
      } finally { clearInterval(timer); }
    });
    assert(check.ticks >= 3, 'UI timers stalled during model calculations');
    assert(check.results.every(result => result.ok));
    assert(Math.abs(check.results[0].mean - 107.23071883247454) < 1e-8);
    assert.equal(check.results[1].testCount, 24);

    await page.evaluate(() => {
      window.levyStages = [];
      new MutationObserver(() => window.levyStages.push({
        states: [...document.querySelectorAll('#levySteps li')].map(el => el.dataset.state),
        value: document.getElementById('levyValue').textContent
      })).observe(document.getElementById('levySteps'), { childList: true });
    });
    await page.locator('#runLevy').click();
    await page.waitForFunction(() => !document.getElementById('runLevy').disabled);
    assert.match(await page.locator('#levyRecommendationNote').innerText(), /Regression-tree recommendation/);
    assert.notEqual(await page.locator('#levyValue').innerText(), '—');
    const reportMetrics = await page.evaluate(async () => (await LevyWasm.report()).metrics);
    for (const [key, id] of Object.entries({ mae: 'treeMae', rmse: 'treeRmse', previousLevyBaseline: 'treePreviousBaseline', trainingMeanBaseline: 'treeMeanBaseline', currentLevyBaseline: 'treeCurrentBaseline', walkForwardRmse: 'treeWalkForward' })) {
      const text = await page.locator('#' + id).innerText();
      assert(!text.includes('%'));
      assert(Math.abs(Number(text.replaceAll(',', '')) - reportMetrics[key]) <= 0.0051, id + ': displayed metric mismatch');
    }
    assert.equal(await page.locator('#treeMape').count(), 0);
    assert.notEqual(await page.locator('#statMape').innerText(), '—', 'Tracker MAPE remains unchanged');
    assert.deepEqual(await page.locator('#levySteps li span:first-child').allTextContents(), [
      '1. Load latest fortnight data', '2. Calculate required levy', '3. Walk the decision tree', '4. Apply the multiplier'
    ]);
    assert.equal(await page.locator('#levySteps li[data-state="done"]').count(), 4);
    assert(await page.evaluate(() => window.levyStages.some(stage => stage.states.length === 4 && stage.states.every(state => state === 'done') && stage.value === '—')),
      'Show completed calculation steps before revealing the recommendation');
    assert.equal(workers.length, 1, 'Reuse the initialized model worker');
    assert.equal(await page.locator('.levy-band-scale, #buildup, #cards').count(), 0);
    for (const id of ['levyRequired', 'levyMultiplier', 'levyCurrent', 'levyDifference', 'levyCrude', 'levyPeriodStart', 'levyPeriodEnd']) {
      assert.notEqual(await page.locator('#' + id).innerText(), '—', id);
    }
    const values = await page.evaluate(() => {
      const value = id => Number(document.getElementById(id).textContent.replace(/[^0-9.+-]/g, ''));
      const workspace = document.querySelector('.levy-workspace');
      const [left, right] = [...workspace.children].map(el => el.getBoundingClientRect().width);
      return { current: value('levyCurrent'), levy: value('levyValue'), difference: value('levyDifference'), required: value('levyRequired'), multiplier: value('levyMultiplier'), ratio: right / left };
    });
    assert.equal(values.current, 85);
    assert(Math.abs(values.difference - (values.levy - values.current)) < 0.011);
    assert(Math.abs(values.required * values.multiplier - values.levy) < 0.05);
    assert(Math.abs(values.ratio - 1.618) < 0.01, 'Preserve the desktop golden split');
    assert.equal(await page.locator('#levyPeriodStart').innerText(), '01 Nov 2026');
    assert.equal(await page.locator('#levyPeriodEnd').innerText(), '15 Nov 2026');
    // Both controls must work again after the shared busy state has cleared.
    await page.locator('#runForecast').click();
    await page.waitForFunction(() => !document.getElementById('runForecast').disabled);
    assert.match(await page.locator('#runSummary').innerText(), /mean of the next 15/);
    await page.locator('#runLevy').click();
    await page.waitForFunction(() => !document.getElementById('runLevy').disabled);
    assert.match(await page.locator('#levyRecommendationNote').innerText(), /Regression-tree recommendation/);
    await page.locator('#levy').scrollIntoViewIfNeeded();
    if (process.env.LEVY_SCREENSHOTS) await page.locator('#levy').screenshot({ path: 'tmp/levy-desktop.png', animations: 'disabled' });
    await page.locator('#benchmarks').scrollIntoViewIfNeeded();
    if (process.env.LEVY_SCREENSHOTS) await page.locator('#benchmarks').screenshot({ path: 'tmp/benchmarks-desktop.png', animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#levy').scrollIntoViewIfNeeded();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile layout must not overflow');
    if (process.env.LEVY_SCREENSHOTS) await page.locator('#levy').screenshot({ path: 'tmp/levy-mobile.png', animations: 'disabled' });
    await page.locator('#benchmarks').scrollIntoViewIfNeeded();
    if (process.env.LEVY_SCREENSHOTS) await page.locator('#benchmarks').screenshot({ path: 'tmp/benchmarks-mobile.png', animations: 'disabled' });
    assert.equal(navigations, 1, 'Calculations and result updates must not reload the document');
    assert.deepEqual(errors, []);
    const recovery = await browser.newPage();
    await recovery.goto(`http://127.0.0.1:${server.address().port}/frontend/index.html`);
    await recovery.route('**/Binding/levy-worker.js', route => route.abort());
    const failure = await recovery.evaluate(() => LevyWasm.init().then(() => '', error => error.message));
    assert(failure, 'Worker startup failure must be reported instead of leaving requests pending');
    await recovery.unroute('**/Binding/levy-worker.js');
    assert.equal(await recovery.evaluate(() => LevyWasm.init()), true, 'Retry after worker startup failure');
    console.log('Browser checks passed: Forecast, Levy, metrics, worker reuse, and responsive UI timers (' + check.ticks + ' ticks).');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
