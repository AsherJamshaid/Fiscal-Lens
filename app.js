/* ENTRY POINT: plain JS; no build step or chart CDN required. */
const $ = id => document.getElementById(id);
// DEFAULT VISIBILITY: a focused first view; all eight inputs remain selectable.
const selected = new Set(['forecast_crude_price', 'usd_pkr', 'current_levy']);
const number = v => v == null ? '—' : new Intl.NumberFormat('en-PK', {maximumFractionDigits:2}).format(v);

// LEGEND: each checkbox toggles one feature and redraws the chart/table.
FEATURES.forEach(f => {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox'; input.checked = selected.has(f.key); input.style.accentColor = f.color;
  input.addEventListener('change', () => {
    input.checked ? selected.add(f.key) : selected.delete(f.key); renderChart();
  });
  label.append(input, document.createTextNode(f.label)); label.style.color = f.color;
  $('legend').append(label);
});

// SVG HELPER: textContent keeps labels as text, including future backend strings.
function svgElement(tag, attrs, text) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
  if (text !== undefined) el.textContent = text;
  $('chart').append(el); return el;
}
function renderChart() {
  const count = Number($('window').value);
  const rows = count ? HISTORY.slice(-count) : HISTORY;
  $('chart').replaceChildren(); $('values').replaceChildren();
  // INDEXING: signed baseline magnitude supports negative fiscal gaps.
  // Formula equals value/base*100 for positive baselines. Zero baselines are skipped.
  const active = FEATURES.filter(f => selected.has(f.key));
  const series = active.filter(f => rows.length && rows[0][f.key] !== 0).map(f => ({...f,
    points: rows.map(r => 100 + (r[f.key]-rows[0][f.key])/Math.abs(rows[0][f.key])*100)
  }));
  if (!rows.length || !series.length) {
    $('chart-note').textContent = 'No chartable features. Select a feature with a nonzero starting value.';
    // Keep raw values available even when every selected series has a zero baseline.
    renderValues(rows, active); return;
  }
  // CHART GEOMETRY: left/right/top/bottom margins and plot dimensions.
  const left=76, top=24, width=890, height=430;
  const all = series.flatMap(s => s.points), min=Math.min(...all), max=Math.max(...all);
  const pad=(max-min)*.08 || 10, low=min-pad, high=max+pad;
  const x=i=>left+i/Math.max(rows.length-1,1)*width;
  const y=v=>top+height-(v-low)/(high-low)*height;
  for(let i=0;i<=4;i++) {
    const value=low+(high-low)*i/4;
    svgElement('line',{x1:left,y1:y(value),x2:left+width,y2:y(value),stroke:getComputedStyle(document.documentElement).getPropertyValue('--line').trim()});
    svgElement('text',{x:left-10,y:y(value)+4,'text-anchor':'end',fill:getComputedStyle(document.documentElement).getPropertyValue('--muted').trim(),'font-size':18},number(value));
  }
  [0,Math.floor((rows.length-1)/2),rows.length-1].forEach(i => svgElement('text',{
    x:x(i),y:495,'text-anchor':i===0?'start':i===rows.length-1?'end':'middle',fill:getComputedStyle(document.documentElement).getPropertyValue('--muted').trim(),'font-size':18
  },rows[i].date));
  series.forEach(s => {
    svgElement('polyline',{points:s.points.map((v,i)=>`${x(i)},${y(v)}`).join(' '),fill:'none',stroke:s.color,'stroke-width':3});
    s.points.forEach((v,i) => {
      const point=svgElement('circle',{cx:x(i),cy:y(v),r:3,fill:s.color});
      const title=document.createElementNS('http://www.w3.org/2000/svg','title');
      title.textContent=`${s.label} · ${rows[i].date}: ${number(rows[i][s.key])} ${s.unit}`; point.append(title);
    });
  });
  renderValues(rows, active);
  $('chart-note').textContent=`${rows[0].date} → ${rows.at(-1).date} · ${rows.length} observations.${series.length < active.length ? " Zero-baseline series omitted." : ""}`;
}

// SOURCE TABLE: separate from chart scaling so zero-baseline values remain inspectable.
function renderValues(rows, active) {
  rows.forEach(r => active.forEach(f => {
    const tr=document.createElement('tr');
    [r.date,f.label,number(r[f.key]),f.unit].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});
    $('values').append(tr);
  }));
}

// PREDICTION CARDS: null forecasts intentionally display a dash, never fake predictions.
// TODO BACKEND: replace PREDICTIONS via a JSON export or API and call renderCards().
function renderCards() {
  $('cards').replaceChildren();
  PREDICTIONS.forEach(p => {
    const card=document.createElement('article'); card.className='card';
    const add=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;el.textContent=text;card.append(el);};
    add('div','eyebrow',p.label); add('div','metric',number(p.forecast)); add('div','unit',p.unit);
    add('p','note',p.forecast == null ? 'Forecast unavailable' : `Forecast for ${p.targetDate}`);
    card.append(document.createElement('hr'));
    add('strong','',`Historical: ${number(p.current)}`);
    add('p','note',`${p.date} · ${p.source}`);
    $('cards').append(card);
  });
}

// WALKTHROUGH CONTENT: edit these descriptions or add steps; the buttons build automatically.
const STEPS = [
  {title:'Prepare inputs',copy:'Align daily prices, monthly indicators and fortnightly levy records to a common prediction cutoff. Use only information available before that cutoff.',visual:'Daily prices + monthly indicators → dated feature rows'},
  {title:'Forecast crude',copy:'Fit an AR(p) model to log differences, select the order using rolling validation, then convert forecasts back to price levels.',visual:'Prices → log → difference → AR(p) → integrate → price forecast'},
  {title:'Estimate levy',copy:'The regression tree chooses splits using SSE. Inputs follow the learned branches to a leaf, which returns its mean training levy.',visual:'8 inputs → learned threshold tests → leaf mean → levy estimate'},
  {title:'Build fuel price',copy:'Combine import cost, margins, IFEM, taxes and levy. Count carbon levy separately only if it is excluded from the predicted levy.',visual:'Import cost + OMC + dealer + IFEM + GST + petroleum levy + carbon levy'}
];
function showStep(index) {
  $('step-number').textContent=`STAGE 0${index+1}`;
  $('step-title').textContent=STEPS[index].title;
  $('step-copy').textContent=STEPS[index].copy;
  $('step-visual').textContent=STEPS[index].visual;
  [...$('steps').children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
}
STEPS.forEach((step,i)=>{const button=document.createElement('button');button.textContent=`0${i+1} · ${step.title}`;button.addEventListener('click',()=>showStep(i));$('steps').append(button);});
$('window').addEventListener('change',renderChart);
renderChart(); renderCards(); showStep(0);
// THEME TOGGLE: swaps data-theme on <html>; chart re-renders to re-read CSS tokens.
const themeBtn = $('theme-toggle');
function setTheme(t, animate) { // CHANGED: added `animate` param
  const apply = () => { // CHANGED: original body moved into apply()
    document.documentElement.dataset.theme = t;
    themeBtn.textContent = t === 'light' ? 'Dark mode' : 'Light mode';
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    try { localStorage.setItem('theme', t); } catch (e) {}
    renderChart();
  };
  // ADDED: cross-fade when supported; instant otherwise or on first load
  if (animate && document.startViewTransition) document.startViewTransition(apply); else apply();
}
// CHANGED: click passes `true` so only user toggles animate
themeBtn.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true));
setTheme(document.documentElement.dataset.theme || 'dark'); // no animation on load
// ACTIVE NAVIGATION: use section positions on scroll, including short bottom sections.
// Add a section and matching nav anchor in HTML; this code discovers them automatically.
const navLinks = [...document.querySelectorAll('.nav a')];
function updateNavigation() {
  let current = navLinks[0];
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
// One animation-frame update per scroll burst keeps navigation inexpensive.
let navigationPending = false;
window.addEventListener('scroll', () => {
  if (navigationPending) return;
  navigationPending = true;
  requestAnimationFrame(() => { updateNavigation(); navigationPending = false; });
}, {passive:true});
window.addEventListener('resize', updateNavigation);
updateNavigation();
