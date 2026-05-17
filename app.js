(function(){
'use strict';
const C={cyan:'#22d3ee',emerald:'#34d399',violet:'#a78bfa',amber:'#fbbf24',rose:'#fb7185',bg:'#0c0e14'};
let pythonOnline=false,computedData=null,snapshots=[];
const state={freq:13,amp:55,wingLen:130,speed:1,layers:{points:true,tangents:false,curvature:false}};
const sim=new BirdSimulation(document.getElementById('canvas-bird'));
// DO NOT auto-start - wait for user click
sim.stop();

async function checkPython(){
  try{const r=await fetch('http://localhost:8000/api/health',{signal:AbortSignal.timeout(1500)});if(r.ok){pythonOnline=true;setEng(true);return}}catch(e){}
  pythonOnline=false;setEng(false);
}
function setEng(on){
  document.getElementById('engine-dot').className='engine-dot '+(on?'online':'offline');
  document.getElementById('engine-label').textContent=on?'Python (SciPy+NumPy)':'JavaScript (fallback)';
  document.getElementById('stat-engine').textContent=on?'SciPy':'JS';
}
async function computePy(){
  try{const r=await fetch('http://localhost:8000/api/compute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({frequency:state.freq,amplitude:state.amp,duration:2,sampleRate:512}),signal:AbortSignal.timeout(5000)});if(r.ok)return await r.json()}catch(e){}return null;
}
function computeJS(){
  const f=state.freq,a=state.amp,p=1/f,w=2*Math.PI*f;
  const fr=[0,.1,.2,.35,.5,.65,.75,.88,1],ct=fr.map(v=>v*p),cy=ct.map(t=>a*(Math.sin(w*t)+.15*Math.sin(2*w*t))/1.15);
  const sp=new CubicSpline(ct,cy),sd=sp.sample(400);
  const ns=1024,sr=512,st=[],sy=[];
  for(let i=0;i<ns;i++){const t=i/sr;st.push(t);sy.push(a*(Math.sin(w*t)+.15*Math.sin(2*w*t))/1.15)}
  const ff=FourierAnalysis.fft(sy,sr);
  return{engine:'js',params:{frequency:f,amplitude:a,period_ms:p*1000},controlPoints:{t:ct,y:cy},
    spline:{t:sd.x,y:sd.y,dy:sd.dy,ddy:sd.ddy},
    coefficients:sp.coefficients.map((s,i)=>({segment:i,x0:s.x0,x1:s.x1,a:s.a,b:s.b,c:s.c,d:s.d})),
    signal:{t:st,y:sy},fourier:{frequencies:ff.frequencies,magnitudes:ff.magnitudes,fundamentalFreq:ff.fundamentalFreq,fundamentalPeriod_ms:ff.fundamentalPeriod*1000,fundamentalIndex:ff.fundamentalIndex}};
}
async function recomputeAll(){
  sim.flapFrequency=state.freq;sim.flapAmplitude=state.amp;sim.wingLength=state.wingLen;sim.setSpeed(state.speed);
  computedData=pythonOnline?(await computePy()||computeJS()):computeJS();
  updateStats();updateTable();updateFourierUI();drawAllCharts();
}
function updateStats(){
  if(!computedData)return;
  document.getElementById('stat-freq').textContent=state.freq+' Hz';
  document.getElementById('stat-points').textContent=computedData.controlPoints.t.length;
  document.getElementById('stat-splines').textContent=computedData.coefficients.length;
}
function updateTable(){
  if(!computedData)return;
  const tb=document.getElementById('tbody-coefficients');tb.innerHTML='';
  computedData.coefficients.forEach((s,i)=>{const tr=document.createElement('tr');
    tr.innerHTML=`<td>S<sub>${i}</sub></td><td>[${(s.x0*1000).toFixed(2)}, ${(s.x1*1000).toFixed(2)}] ms</td><td>${s.a.toFixed(6)}</td><td>${s.b.toFixed(4)}</td><td>${s.c.toFixed(4)}</td><td>${s.d.toFixed(4)}</td>`;
    tb.appendChild(tr)});
}
function updateFourierUI(){
  if(!computedData)return;const f=computedData.fourier;
  document.getElementById('fourier-freq').textContent=f.fundamentalFreq.toFixed(1)+' Hz';
  document.getElementById('fourier-period').textContent=f.fundamentalPeriod_ms.toFixed(1)+' ms';
  const ok=f.fundamentalFreq>=12&&f.fundamentalFreq<=15;
  document.getElementById('fourier-match').textContent=ok?'✓ Coincide':'✗ Fuera de rango';
  document.getElementById('fourier-match').style.color=ok?'#34d399':'#fb7185';
  document.getElementById('rt-fourier-freq').textContent=f.fundamentalFreq.toFixed(1)+' Hz';
  document.getElementById('rt-fourier-period').textContent=f.fundamentalPeriod_ms.toFixed(1)+' ms';
  const rm=document.getElementById('rt-bio-match');rm.textContent=ok?'✓ Coincide':'✗ Fuera';rm.style.color=ok?'#34d399':'#fb7185';
}

// SNAPSHOT on pause
function captureSnapshot(){
  if(!computedData)return;
  const a=sim.getWingAngle(sim.time),v=sim.getWingVelocity(sim.time),ac=sim.getWingAccel(sim.time);
  snapshots.push({id:snapshots.length+1,time:new Date().toLocaleTimeString(),simT:sim.time.toFixed(3),angle:a.toFixed(2),vel:v.toFixed(0),acc:ac.toFixed(0),freq:state.freq,cycle:sim.cycle,phase:a>0?'Upstroke':'Downstroke'});
  let c=document.getElementById('snapshot-container');
  if(!c){c=document.createElement('div');c.id='snapshot-container';c.innerHTML='<h3 class="sp-title">📸 Capturas (Pausa)</h3>';c.style.cssText='padding:12px;border-top:1px solid rgba(148,163,184,.08);max-height:200px;overflow-y:auto';document.getElementById('panel-right').appendChild(c)}
  const s=snapshots[snapshots.length-1],d=document.createElement('div');
  d.style.cssText='background:rgba(34,211,238,.05);border:1px solid rgba(34,211,238,.15);border-radius:8px;padding:8px;margin-top:6px;font-size:.68rem';
  d.innerHTML=`<div style="color:#22d3ee;font-weight:700">#${s.id} — ${s.time}</div><div style="color:#94a3b8">t=${s.simT}s | θ=${s.angle}° | ω=${s.vel}°/s</div><div style="color:#94a3b8">Ciclo:${s.cycle} | ${s.phase}</div>`;
  c.appendChild(d);c.scrollTop=c.scrollHeight;
}

// === CHART ENGINE ===
function drawChart(cid,cfg){
  const cv=document.getElementById(cid);if(!cv)return;
  const dpr=window.devicePixelRatio||1,rect=cv.getBoundingClientRect();
  cv.width=rect.width*dpr;cv.height=rect.height*dpr;
  const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=rect.width,H=rect.height,pad={top:30,right:30,bottom:45,left:60},pw=W-pad.left-pad.right,ph=H-pad.top-pad.bottom;
  ctx.clearRect(0,0,W,H);ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(148,163,184,.06)';ctx.lineWidth=.5;
  for(let i=0;i<=5;i++){const y=pad.top+ph*i/5;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(pad.left+pw,y);ctx.stroke()}
  for(let i=0;i<=8;i++){const x=pad.left+pw*i/8;ctx.beginPath();ctx.moveTo(x,pad.top);ctx.lineTo(x,pad.top+ph);ctx.stroke()}
  ctx.strokeStyle='rgba(148,163,184,.15)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pad.left,pad.top+ph);ctx.lineTo(pad.left+pw,pad.top+ph);ctx.stroke();
  ctx.beginPath();ctx.moveTo(pad.left,pad.top);ctx.lineTo(pad.left,pad.top+ph);ctx.stroke();
  const{xMin,xMax,yMin,yMax}=cfg;
  const toX=v=>pad.left+((v-xMin)/(xMax-xMin))*pw,toY=v=>pad.top+ph-((v-yMin)/(yMax-yMin))*ph;
  if(yMin<0&&yMax>0){ctx.strokeStyle='rgba(148,163,184,.08)';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(pad.left,toY(0));ctx.lineTo(pad.left+pw,toY(0));ctx.stroke();ctx.setLineDash([])}
  for(const ds of cfg.datasets){
    if(ds.type==='bar'){
      const bw=Math.max(1.5,pw/ds.x.length*.6);
      for(let i=0;i<ds.x.length;i++){const x=toX(ds.x[i]),y0=toY(0),y=toY(ds.y[i]);const g=ctx.createLinearGradient(x,y,x,y0);g.addColorStop(0,ds.color||C.cyan);g.addColorStop(1,'rgba(34,211,238,.05)');ctx.fillStyle=g;ctx.fillRect(x-bw/2,Math.min(y,y0),bw,Math.abs(y-y0))}
      if(ds.hlIdx>=0&&ds.hlIdx<ds.x.length){const hx=toX(ds.x[ds.hlIdx]),hy=toY(ds.y[ds.hlIdx]);ctx.fillStyle=C.amber;ctx.shadowColor=C.amber;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(hx,hy,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.font='700 12px "JetBrains Mono"';ctx.textAlign='center';ctx.fillText(ds.x[ds.hlIdx].toFixed(1)+' Hz',hx,hy-16)}
    }else{
      ctx.strokeStyle=ds.color||C.cyan;ctx.lineWidth=ds.lineWidth||2;ctx.shadowColor=ds.color||C.cyan;ctx.shadowBlur=3;
      ctx.beginPath();for(let i=0;i<ds.x.length;i++){const x=toX(ds.x[i]),y=toY(ds.y[i]);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();ctx.shadowBlur=0;
    }
    if(ds.points){for(let i=0;i<ds.points.x.length;i++){const px=toX(ds.points.x[i]),py=toY(ds.points.y[i]);ctx.fillStyle='rgba(251,191,36,.2)';ctx.beginPath();ctx.arc(px,py,8,0,Math.PI*2);ctx.fill();ctx.fillStyle=C.amber;ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(251,191,36,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.stroke()}}
  }
  // TANGENTS - green vectors at control points
  if(cfg.tangentData&&state.layers.tangents){const td=cfg.tangentData;ctx.strokeStyle='rgba(52,211,153,.6)';ctx.lineWidth=1.5;
    for(let i=0;i<td.x.length;i++){const px=toX(td.x[i]),py=toY(td.y[i]),slope=td.dy[i],len=20,dx=len,dy=-slope*len*(ph/(yMax-yMin))/(pw/(xMax-xMin));const mag=Math.sqrt(dx*dx+dy*dy),nx=dx/mag*25,ny=dy/mag*25;
      ctx.beginPath();ctx.moveTo(px-nx,py-ny);ctx.lineTo(px+nx,py+ny);ctx.stroke();ctx.fillStyle=C.emerald;ctx.beginPath();ctx.arc(px+nx,py+ny,3,0,Math.PI*2);ctx.fill()}}
  // CURVATURE - circles showing radius of curvature
  if(cfg.curvData&&state.layers.curvature){ctx.strokeStyle='rgba(251,113,133,.3)';ctx.lineWidth=1;
    for(let i=0;i<cfg.curvData.x.length;i+=12){const px=toX(cfg.curvData.x[i]),py=toY(cfg.curvData.y[i]),k=cfg.curvData.k[i];
      if(Math.abs(k)>0.5){const R=Math.min(40,Math.max(5,500/Math.abs(k)));const dir=k>0?-1:1;ctx.beginPath();ctx.arc(px,py+dir*R,R,0,Math.PI*2);ctx.stroke()}}}
  // Cursor line (for live signal)
  if(cfg.cursorX!==undefined){const cx=toX(cfg.cursorX);ctx.strokeStyle='rgba(251,191,36,.7)';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(cx,pad.top);ctx.lineTo(cx,pad.top+ph);ctx.stroke();ctx.setLineDash([]);
    if(cfg.cursorY!==undefined){ctx.fillStyle=C.amber;ctx.shadowColor=C.amber;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(cx,toY(cfg.cursorY),5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}}
  // Axis labels
  ctx.font='500 10px "JetBrains Mono"';ctx.fillStyle='rgba(148,163,184,.5)';
  for(let i=0;i<=5;i++){const v=yMin+(yMax-yMin)*(5-i)/5;ctx.textAlign='right';ctx.fillText(v.toFixed(1),pad.left-8,pad.top+ph*i/5+4)}
  for(let i=0;i<=8;i++){const v=xMin+(xMax-xMin)*i/8;ctx.textAlign='center';ctx.fillText(v.toFixed(cfg.xDec||1),pad.left+pw*i/8,pad.top+ph+18)}
  ctx.font='600 11px Inter';ctx.fillStyle='rgba(148,163,184,.4)';ctx.textAlign='center';ctx.fillText(cfg.xLabel||'',pad.left+pw/2,H-5);
  ctx.save();ctx.translate(14,pad.top+ph/2);ctx.rotate(-Math.PI/2);ctx.fillText(cfg.yLabel||'',0,0);ctx.restore();
  if(cfg.title){ctx.textAlign='left';ctx.fillText(cfg.title,pad.left,18)}
  cv._ci={pad,pw,ph,xMin,xMax,yMin,yMax,toX,toY};
}

function drawAllCharts(){
  if(!computedData)return;const d=computedData,per=d.params.period_ms;
  const xms=d.spline.t.map(v=>v*1000),cxms=d.controlPoints.t.map(v=>v*1000);
  // Tangent data from spline derivatives at control points
  const tangentData={x:cxms,y:d.controlPoints.y,dy:cxms.map(xm=>{const idx=d.spline.t.reduce((best,t,i)=>Math.abs(t*1000-xm)<Math.abs(d.spline.t[best]*1000-xm)?i:best,0);return d.spline.dy[idx]})};
  // Curvature data from second derivative
  const curvData={x:xms,y:d.spline.y,k:d.spline.ddy};
  // Cursor position from simulation time
  const cursorMs=sim.playing?(sim.time%(1/state.freq))*1000:undefined;
  const cursorY=cursorMs!==undefined?sim.getWingAngle(sim.time):undefined;

  drawChart('canvas-spline',{xMin:0,xMax:per,yMin:-state.amp*1.2,yMax:state.amp*1.2,xLabel:'Tiempo (ms)',yLabel:'Ángulo (°)',title:'Spline Cúbico — Un Ciclo de Aleteo',tangentData,curvData,cursorX:cursorMs,cursorY,
    datasets:[{x:xms,y:d.spline.y,color:C.cyan,lineWidth:2,points:state.layers.points?{x:cxms,y:d.controlPoints.y}:null}]});

  const dyM=Math.max(...d.spline.dy.map(Math.abs))*1.2||1,ddyM=Math.max(...d.spline.ddy.map(Math.abs))*1.2||1;
  drawChart('canvas-derivatives',{xMin:0,xMax:per,yMin:-state.amp*1.2,yMax:state.amp*1.2,xLabel:'Tiempo (ms)',yLabel:'Amplitud Normalizada',title:"S'(t) · S''(t)",cursorX:cursorMs,
    datasets:[{x:xms,y:d.spline.dy.map(v=>v/dyM*state.amp),color:C.emerald,lineWidth:1.5},{x:xms,y:d.spline.ddy.map(v=>v/ddyM*state.amp),color:C.rose,lineWidth:1.5}]});

  // Signal: show full smooth waveform always
  const sigDur=.35,sigPts=400,sigT=[],sigY=[];
  const w=2*Math.PI*state.freq;
  for(let i=0;i<sigPts;i++){const t=i/sigPts*sigDur;sigT.push(t*1000);sigY.push(state.amp*(Math.sin(w*t)+.15*Math.sin(2*w*t))/1.15)}
  const sigCursorMs=sim.playing?((sim.time%(1/state.freq))/sigDur*sigDur*1000)%((sigDur)*1000):undefined;
  drawChart('canvas-signal',{xMin:0,xMax:sigDur*1000,yMin:-state.amp*1.2,yMax:state.amp*1.2,xLabel:'Tiempo (ms)',yLabel:'Ángulo (°)',title:'Señal Temporal — Punta del Ala',cursorX:sim.playing?((sim.time%sigDur)*1000):undefined,cursorY:sim.playing?sim.getWingAngle(sim.time):undefined,
    datasets:[{x:sigT,y:sigY,color:C.violet,lineWidth:2}]});

  const fr=d.fourier.frequencies,mg=d.fourier.magnitudes,maxF=60;
  const fM=[];for(let i=0;i<fr.length;i++)if(fr[i]>0&&fr[i]<=maxF)fM.push(i);
  const fS=fM.map(i=>fr[i]),mS=fM.map(i=>mg[i]),mMax=Math.max(...mS)*1.3||1;
  drawChart('canvas-spectrum',{xMin:0,xMax:maxF,yMin:0,yMax:mMax,xLabel:'Frecuencia (Hz)',yLabel:'|F(ω)|',title:'Espectro — DFT',xDec:0,
    datasets:[{x:fS,y:mS,type:'bar',color:C.cyan,hlIdx:fS.findIndex(f=>Math.abs(f-d.fourier.fundamentalFreq)<.5)}]});
}

// LIVE UPDATE LOOP - updates charts in real-time during simulation
let lastLiveT=0;
function liveLoop(ts){
  if(sim.playing&&computedData){
    if(ts-lastLiveT>50){lastLiveT=ts;drawAllCharts()}// ~20fps for charts
  }
  requestAnimationFrame(liveLoop);
}
requestAnimationFrame(liveLoop);

// Interactive spline drag
let dragIdx=-1;const sC=document.getElementById('canvas-spline');
sC.addEventListener('mousedown',e=>{if(!computedData||!state.layers.points)return;const r=sC.getBoundingClientRect(),ci=sC._ci;if(!ci)return;const mx=e.clientX-r.left,my=e.clientY-r.top;
  for(let i=1;i<computedData.controlPoints.t.length-1;i++){if(Math.hypot(mx-ci.toX(computedData.controlPoints.t[i]*1000),my-ci.toY(computedData.controlPoints.y[i]))<12){dragIdx=i;sC.style.cursor='grabbing';return}}});
window.addEventListener('mousemove',e=>{if(dragIdx<0||!computedData)return;const r=sC.getBoundingClientRect(),ci=sC._ci;if(!ci)return;const my=e.clientY-r.top;
  computedData.controlPoints.y[dragIdx]=Math.max(-state.amp*1.1,Math.min(state.amp*1.1,ci.yMax-((my-ci.pad.top)/ci.ph)*(ci.yMax-ci.yMin)));
  const sp=new CubicSpline(computedData.controlPoints.t,computedData.controlPoints.y),sd=sp.sample(400);
  computedData.spline={t:sd.x,y:sd.y,dy:sd.dy,ddy:sd.ddy};computedData.coefficients=sp.coefficients.map((s,i)=>({segment:i,x0:s.x0,x1:s.x1,a:s.a,b:s.b,c:s.c,d:s.d}));
  updateTable();drawAllCharts()});
window.addEventListener('mouseup',()=>{if(dragIdx>=0){dragIdx=-1;sC.style.cursor='crosshair'}});

// Wire controls
function bind(id,vid,fmt,cb){const s=document.getElementById(id),v=document.getElementById(vid);s.addEventListener('input',()=>{v.textContent=fmt(s.value);cb(parseFloat(s.value))})}
bind('ctrl-freq','val-freq',v=>v+' Hz',v=>{state.freq=v;recomputeAll()});
bind('ctrl-amp','val-amp',v=>'±'+v+'°',v=>{state.amp=v;recomputeAll()});
bind('ctrl-wing-len','val-wing-len',v=>v+' px',v=>{state.wingLen=v;sim.wingLength=v});
bind('ctrl-speed','val-speed',v=>parseFloat(v).toFixed(1)+'x',v=>{state.speed=v;sim.setSpeed(v)});
function tog(id,p){document.getElementById(id).addEventListener('change',e=>{sim[p]=e.target.checked;if(!sim.playing)sim._draw(sim.time)})}
tog('chk-ghost','showGhost');tog('chk-ctrl-pts','showCtrlPts');tog('chk-angle-arc','showAngleArc');tog('chk-particles','showParticles');tog('chk-feathers','showFeathers');
['btn-show-points','btn-show-tangents','btn-show-curvature'].forEach(id=>{document.getElementById(id).addEventListener('click',e=>{const l=e.currentTarget.dataset.layer;state.layers[l]=!state.layers[l];e.currentTarget.classList.toggle('active',state.layers[l]);drawAllCharts()})});

// PLAY/PAUSE - snapshot on pause
document.getElementById('btn-play').addEventListener('click',()=>{
  if(sim.playing){sim.stop();document.getElementById('icon-play').style.display='';document.getElementById('icon-pause').style.display='none';captureSnapshot();drawAllCharts()}
  else{sim.start();document.getElementById('icon-play').style.display='none';document.getElementById('icon-pause').style.display=''}});
document.getElementById('btn-reset').addEventListener('click',()=>{sim.stop();sim.reset();document.getElementById('icon-play').style.display='';document.getElementById('icon-pause').style.display='none';drawAllCharts()});
document.getElementById('btn-recalc').addEventListener('click',()=>recomputeAll());
// Hero CTA starts simulation
document.getElementById('btn-start').addEventListener('click',e=>{e.preventDefault();document.getElementById('section-simulation').scrollIntoView({behavior:'smooth'});setTimeout(()=>{if(!sim.playing){sim.start();document.getElementById('icon-play').style.display='none';document.getElementById('icon-pause').style.display=''}},800)});
window.addEventListener('resize',()=>{drawAllCharts();sim._resize();if(!sim.playing)sim._draw(sim.time)});

// INIT - no auto-start
(async function(){
  await checkPython();await recomputeAll();sim._draw(0);drawAllCharts();
  document.querySelectorAll('.section').forEach(s=>{s.style.opacity='0';s.style.transform='translateY(30px)';s.style.transition='opacity .8s ease,transform .8s ease';
    new IntersectionObserver(([e])=>{if(e.isIntersecting){s.style.opacity='1';s.style.transform='translateY(0)'}},{threshold:.1}).observe(s)});
  const pc=document.getElementById('hero-particles');
  for(let i=0;i<25;i++){const d=document.createElement('div');d.style.cssText=`position:absolute;width:${1+Math.random()*2}px;height:${1+Math.random()*2}px;background:rgba(34,211,238,${.1+Math.random()*.2});border-radius:50%;left:${Math.random()*100}%;top:${Math.random()*100}%;animation:pf ${5+Math.random()*10}s ease-in-out infinite alternate`;pc.appendChild(d)}
  document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'@keyframes pf{0%{transform:translate(0,0);opacity:.3}50%{opacity:.7}100%{transform:translate(20px,-15px);opacity:.15}}'}));
})();
})();
