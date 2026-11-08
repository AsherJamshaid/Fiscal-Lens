const $ = id => document.getElementById(id);
const number = v => v == null ? '—' : new Intl.NumberFormat('en-PK', {maximumFractionDigits:2}).format(v);
function renderCards() {
  $('cards').replaceChildren();
  PREDICTIONS.forEach(p => {
    const card=document.createElement('article'); card.className='card';
    const heading=document.createElement('div'), value=document.createElement('div');
    heading.className='reference-heading'; value.className='reference-value';
    const label=document.createElement('h3'); label.textContent=p.label;
    const date=document.createElement('p'); date.className='small-note'; date.textContent=p.forecast==null?p.date:p.targetDate;
    heading.append(label,date);
    const metric=document.createElement('div'); metric.className='metric'; metric.textContent=number(p.forecast??p.current);
    const unit=document.createElement('p'); unit.className='unit'; unit.textContent=p.unit;
    const status=document.createElement('span'); status.className='small-note'; status.textContent=p.forecast==null?'Historical':'Forecast';
    value.append(metric,unit,status); card.append(heading,value); $('cards').append(card);
  });
}

renderCards();
const themeBtn = $('theme-toggle');
function setTheme(t, animate) {
  const apply = () => {
    document.documentElement.dataset.theme = t;
    const themeAction = t === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    themeBtn.setAttribute('aria-label', themeAction);
    themeBtn.title = themeAction;
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    try { localStorage.setItem('theme', t); } catch (e) {}

  };
  if (animate && document.startViewTransition) document.startViewTransition(apply); else apply();
}
themeBtn.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true));
setTheme(document.documentElement.dataset.theme || 'dark');
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
let navigationPending = false;
window.addEventListener('scroll', () => {
  if (navigationPending) return;
  navigationPending = true;
  requestAnimationFrame(() => { updateNavigation(); navigationPending = false; });
}, {passive:true});
window.addEventListener('resize', updateNavigation);
updateNavigation();

// EDITS START: recommendation display (moved from renderLevySummary), called when the animation finishes
function renderLevyResult() {
  const levy=PREDICTIONS.find(p=>p.label==='Petroleum levy');
  $('levyValue').textContent=Number.isFinite(levy?.forecast)?number(levy.forecast):'—';
  $('levyRecommendationNote').textContent=Number.isFinite(levy?.forecast)
    ? 'Regression-tree recommendation for '+levy.targetDate+'.' : 'Recommendation pending.';
  document.querySelectorAll('.levy-band-scale span').forEach(el=>{
    const active=Number.isFinite(levy?.forecast)&&el.dataset.band===levy.band;
    el.classList.toggle('is-on',active);
    if(active) el.setAttribute('aria-current','true'); else el.removeAttribute('aria-current');
  });
}
// EDITS END

function renderLevySummary() {
  const price=PREDICTIONS.find(p=>p.label==='Petrol price'), levy=PREDICTIONS.find(p=>p.label==='Petroleum levy');
  // EDITS: recommendation display moved out to renderLevyResult() (shown after the animation)
  $('buildup').replaceChildren(); $('buildupKeys').replaceChildren();
  if(!price || !levy || price.date!==levy.date || !(price.current>0) || !(levy.current>=0 && levy.current<=price.current)) {
    $('buildupNote').textContent='Matching dated price components are unavailable.'; return;
  }
  const segments=[['Other costs and taxes',price.current-levy.current],['Petroleum levy',levy.current]];
  segments.forEach(([label,value])=>{
    const span=document.createElement('span'); span.style.width=value/price.current*100+'%'; span.title=label+': PKR '+number(value);
    $('buildup').append(span);
    const row=document.createElement('div'), dt=document.createElement('dt'), dd=document.createElement('dd');
    dt.textContent=label; dd.textContent='PKR '+number(value); row.append(dt,dd); $('buildupKeys').append(row);
  });
  $('buildup').setAttribute('aria-label',segments.map(([label,value])=>label+': PKR '+number(value)).join('; '));
  $('buildupNote').textContent='Total: PKR '+number(price.current)+' / litre · '+price.date+'.';
}
renderLevySummary();

// EDITS START: regression-tree progress animation (one step every STEP_MS, then reveals the answer)
const STEP_MS = 2000; // time per step; change to speed up/slow down
const TREE_STEPS = [  // step labels; edit freely
  'Load ' + HISTORY.length + ' training rows',
  'Search best split at each node',
  'Grow and prune the tree',
  'Route latest data to a leaf',
  'Read levy from leaf'
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function runLevy() {
  const btn=$('runLevy'), panel=$('levyPanel'), steps=$('levySteps');
  btn.disabled=true; panel.setAttribute('aria-busy','true');
  $('levyResult').hidden=true; $('levyProgress').hidden=false; steps.replaceChildren();
  const rows = TREE_STEPS.map(t => {
    const li=document.createElement('li'), name=document.createElement('span'), st=document.createElement('span');
    li.dataset.state='waiting'; name.textContent=t; st.textContent='Waiting';
    li.append(name,st); steps.append(li); return [li,st];
  });
  for (const [li,st] of rows) {
    li.dataset.state='running'; st.textContent='Running';
    await sleep(STEP_MS);
    li.dataset.state='done'; st.textContent='Done';
  }
  await sleep(400);
  $('levyProgress').hidden=true; $('levyResult').hidden=false;
  renderLevyResult();
  panel.setAttribute('aria-busy','false'); btn.disabled=false;
}
$('runLevy').addEventListener('click', runLevy);
// EDITS END

// Scroll fade-in
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.intersectionRatio >= .12) e.target.classList.add('is-visible');
    else if (!e.isIntersecting) e.target.classList.remove('is-visible');
  }), { threshold: [0, .12] });
  const watchReveal = () => document.querySelectorAll('.hero-banner,.hero-modules .module-card,.section-head,.panel,.card').forEach(el => {
    el.classList.add('reveal');
    el.style.transitionDelay = Math.min([...el.parentElement.children].indexOf(el), 4) * 80 + 'ms';
    io.observe(el);
  });
  watchReveal();
  new MutationObserver(watchReveal).observe($('cards'), { childList: true });
}

// EDITS START: cursor-following glow (feeds --mx / --my to the CSS glow in components.css)
const GLOW_SEL = '.btn,.module-card,.nav a,.theme-toggle';
const moveGlow = e => {
  const el = e.target.closest && e.target.closest(GLOW_SEL);
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', e.clientX - r.left + 'px');
  el.style.setProperty('--my', e.clientY - r.top + 'px');
};
document.addEventListener('pointermove', moveGlow, {passive:true});
document.addEventListener('pointerover', moveGlow, {passive:true});
// EDITS END
