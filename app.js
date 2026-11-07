
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
    themeBtn.textContent = t === 'light' ? 'Dark mode' : 'Light mode';
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
const FORECAST_STAGES = ['Load price history', 'Difference the series once', 'Compute autocorrelations',
  'Fit AR orders · Levinson–Durbin', 'Select order by AIC', 'Validate on held-out observations', 'Generate forecast'];
let forecastResult = null;
const average = a => a.reduce((s,v)=>s+v,0)/a.length;
function difference(values) { return values.slice(1).map((v,i)=>v-values[i]); }
function correlations(values, maxOrder) {
  const mean=average(values), centered=values.map(v=>v-mean);
  return {mean, gamma:Array.from({length:maxOrder+1},(_,lag)=>
    centered.slice(lag).reduce((s,v,i)=>s+v*centered[i],0)/values.length)};
}
function fitOrders(stats,maxOrder) {
  let coefficients=[], variance=stats.gamma[0];
  const fits=[];
  for(let p=1;p<=maxOrder;p++) {
    const reflection=variance>1e-12
      ? (stats.gamma[p]-coefficients.reduce((s,a,j)=>s+a*stats.gamma[p-j-1],0))/variance : 0;
    if(!Number.isFinite(reflection) || Math.abs(reflection)>=1) break;
    const previous=coefficients;
    coefficients=previous.map((a,j)=>a-reflection*previous[p-j-2]).concat(reflection);
    variance=Math.max(0,variance*(1-reflection*reflection));
    fits.push({p, coefficients, mean:stats.mean});
  }
  return fits;
}
function chooseOrder(fits,deltas,maxOrder) {
  const scored=fits.map(fit=>{
    let squared=0;
    for(let i=maxOrder;i<deltas.length;i++) {
      const estimate=fit.mean+fit.coefficients.reduce((s,a,j)=>s+a*(deltas[i-j-1]-fit.mean),0);
      squared+=(deltas[i]-estimate)**2;
    }
    const n=deltas.length-maxOrder;
    return {...fit,aic:n*Math.log(Math.max(squared/n,1e-12))+2*(fit.p+2)};
  });
  scored.sort((a,b)=>a.aic-b.aic);
  if(!scored.length) throw new Error('Unable to fit a stable AR model to this series.');
  return scored[0];
}
function project(fit,values,horizon) {
  const deltas=difference(values), predictions=[];
  let level=values.at(-1);
  for(let i=0;i<horizon;i++) {
    const delta=fit.mean+fit.coefficients.reduce((s,a,j)=>s+a*(deltas.at(-j-1)-fit.mean),0);
    deltas.push(delta); level+=delta;
    if(!Number.isFinite(level)) throw new Error('The model produced an invalid projection.');
    predictions.push(level);
  }
  return predictions;
}
function predictionErrors(actual,predicted) {
  const errors=actual.map((v,i)=>predicted[i]-v);
  const percentages=actual.flatMap((v,i)=>v===0?[]:[Math.abs(errors[i]/v)*100]);
  return {mae:average(errors.map(Math.abs)),rmse:Math.sqrt(average(errors.map(v=>v*v))),
    mape:percentages.length?average(percentages):null};
}
function renderForecastChart() {
  if(!forecastResult) return;
  const {feature,values,predictions}=forecastResult;
  const svg=$('forecastSvg'); svg.replaceChildren();
  const style=getComputedStyle(document.documentElement), color=name=>style.getPropertyValue(name).trim();
  const add=(tag,attrs,text)=>{
    const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
    if(text!==undefined) el.textContent=text;
    svg.append(el); return el;
  };
  const count=Number($('window').value);
  const history=count?values.slice(-count):values, all=history.concat(predictions);
  const min=Math.min(...all), max=Math.max(...all), pad=(max-min)*.1||1;
  const x=i=>76+i/(all.length-1)*890, y=v=>24+430-(v-min+pad)/(max-min+2*pad)*430;
  for(let i=0;i<=4;i++) {
    const v=min-pad+(max-min+2*pad)*i/4;
    add('line',{x1:76,x2:966,y1:y(v),y2:y(v),stroke:color('--line')});
    add('text',{x:66,y:y(v)+5,'text-anchor':'end',fill:color('--muted'),'font-size':18},number(v));
  }
  add('line',{x1:x(history.length-1),x2:x(history.length-1),y1:24,y2:454,
    stroke:color('--muted'),'stroke-dasharray':'4 6'});
  add('polyline',{points:history.map((v,i)=>x(i)+','+y(v)).join(' '),fill:'none',stroke:color('--blue'),'stroke-width':3});
  add('polyline',{points:[history.at(-1),...predictions].map((v,i)=>x(history.length-1+i)+','+y(v)).join(' '),
    fill:'none',stroke:color('--yellow'),'stroke-width':3,'stroke-dasharray':'8 6'});
  predictions.forEach((v,i)=>{
    const point=add('circle',{cx:x(history.length+i),cy:y(v),r:4,fill:color('--yellow')});
    const title=document.createElementNS(svg.namespaceURI,'title');
    title.textContent='Observation +'+(i+1)+': '+number(v)+' '+feature.unit; point.append(title);
  });
  [[0,HISTORY.at(-history.length).date,'start'],[history.length-1,'Last observed','middle'],
    [all.length-1,'+'+predictions.length+' observations','end']].forEach(([i,label,anchor])=>
      add('text',{x:x(i),y:495,'text-anchor':anchor,fill:color('--muted'),'font-size':17},label));
  svg.setAttribute('aria-label',feature.label+': historical values and '+predictions.length+' projected observations in '+feature.unit);
}
async function runOverviewForecast() {
  const button=$('runForecast'), input=$('forecastInput'), windowInput=$('forecastHorizon');
  button.disabled=true; input.disabled=true; windowInput.disabled=true;
  $('forecastPanel').setAttribute('aria-busy','true');
  $('chartIdle').hidden=true; $('chartProgress').hidden=false;
  $('forecastPlot').hidden=true; $('forecastLegend').hidden=true; $('modelInfo').hidden=true;
  forecastResult=null;
  resetAccuracy('Forecast running…');
  $('forecastSteps').replaceChildren();
  const steps=FORECAST_STAGES.map(label=>{
    const li=document.createElement('li'), name=document.createElement('span'), status=document.createElement('span');
    name.textContent=label; status.textContent='Waiting'; li.append(name,status); $('forecastSteps').append(li); return li;
  });
  const paint=()=>new Promise(resolve=>setTimeout(resolve,100));
  async function stage(index,work) {
    const li=steps[index]; li.dataset.state='running'; li.lastChild.textContent='Running';
    $('runSummary').textContent='Step '+(index+1)+' of '+steps.length+' · '+FORECAST_STAGES[index];
    await paint(); const result=work();
    li.dataset.state='done'; li.lastChild.textContent='Done'; return result;
  }
  try {
    const feature=FEATURES.find(f=>f.key===input.value), horizon=Number(windowInput.value);
    const values=await stage(0,()=>{
      const result=HISTORY.map(row=>row[feature.key]);
      if(result.length<20 || !result.every(Number.isFinite)) throw new Error('At least 20 complete numeric observations are required.');
      return result;
    });
    const heldOut=Math.min(12,Math.floor(values.length/4)), training=values.slice(0,-heldOut);
    const deltas=await stage(1,()=>difference(training));
    const maxOrder=Math.min(12,Math.floor(deltas.length/4));
    const stats=await stage(2,()=>correlations(deltas,maxOrder));
    const fits=await stage(3,()=>fitOrders(stats,maxOrder));
    const chosen=await stage(4,()=>chooseOrder(fits,deltas,maxOrder));
    const errors=await stage(5,()=>predictionErrors(values.slice(-heldOut),project(chosen,training,heldOut)));
    const predictions=await stage(6,()=>{
      const fit=fitOrders(correlations(difference(values),chosen.p),chosen.p).find(f=>f.p===chosen.p);
      if(!fit) throw new Error('Unable to refit the selected model.');
      return project(fit,values,horizon);
    });
    forecastResult={feature,values,predictions};
    $('statOrder').textContent=chosen.p; $('statDiff').textContent='1'; $('statNext').textContent=number(predictions[0]);
    $('statMape').textContent=errors.mape===null?'N/A':number(errors.mape)+'%';
    $('statRmse').textContent=number(errors.rmse); $('statMae').textContent=number(errors.mae);
    $('modelNote').textContent='ARI('+chosen.p+', 1) · AIC order selection · '+feature.unit;
    $('accuracyNote').textContent=feature.label+' · '+heldOut+' held-out observations · RMSE / MAE: '+feature.unit+'.';
    $('forecastUnit').textContent=feature.unit;
    renderForecastChart();
    $('chartProgress').hidden=true; $('forecastPlot').hidden=false; $('forecastLegend').hidden=false; $('modelInfo').hidden=false;
    $('runSummary').textContent=feature.label+' · '+horizon+' projected observations.';
  } catch(error) {
    resetAccuracy('Forecast unavailable. Try again.');
    $('runSummary').textContent='Forecast could not run: '+error.message;
    steps.forEach(li=>{if(li.dataset.state==='running') li.lastChild.textContent='Failed';});
  } finally {
    button.disabled=false; input.disabled=false; windowInput.disabled=false;
    $('forecastPanel').setAttribute('aria-busy','false');
  }
}
$('runForecast').addEventListener('click',runOverviewForecast);
function resetAccuracy(message) {
  ['statMape','statRmse','statMae'].forEach(id=>$(id).textContent='—');
  $('accuracyNote').textContent=message;
}
$('window').addEventListener('change',renderForecastChart);
function invalidateForecast() {
  resetAccuracy('Run a forecast to view accuracy.');
  forecastResult=null;
  $('forecastPlot').hidden=true; $('forecastLegend').hidden=true; $('modelInfo').hidden=true; $('chartProgress').hidden=true;
  $('chartIdle').hidden=false; $('forecastUnit').textContent='Ready to run';
  $('runSummary').textContent='Settings changed. Click Run forecast to refresh.';
}
$('forecastInput').addEventListener('change',invalidateForecast);
$('forecastHorizon').addEventListener('change',invalidateForecast);
new MutationObserver(()=>renderForecastChart()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
function renderLevySummary() {
  const price=PREDICTIONS.find(p=>p.label==='Petrol price'), levy=PREDICTIONS.find(p=>p.label==='Petroleum levy');
  $('levyValue').textContent=Number.isFinite(levy?.forecast)?number(levy.forecast):'—';
  $('levyRecommendationNote').textContent=Number.isFinite(levy?.forecast)
    ? 'Regression-tree recommendation for '+levy.targetDate+'.' : 'Recommendation pending.';
  document.querySelectorAll('.levy-band-scale span').forEach(el=>{
    const active=Number.isFinite(levy?.forecast)&&el.dataset.band===levy.band;
    el.classList.toggle('is-on',active);
    if(active) el.setAttribute('aria-current','true'); else el.removeAttribute('aria-current');
  });
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