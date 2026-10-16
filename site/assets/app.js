const $=id=>document.getElementById(id);

let WEATHER=null;
const INIT=window.HM_INIT||{};
let st={place:12,day:0,slot:null,target:null};
try{const s=JSON.parse(localStorage.getItem("hoshimiru2")||"null");if(s){if(PLACES[s.place])st.place=s.place;if(s.target)st.target=s.target}}catch(e){}
if(INIT.place!=null)st.place=INIT.place;
if(INIT.target)st.target=INIT.target;
if(INIT.day!=null)st.day=INIT.day;
const save=()=>{try{localStorage.setItem("hoshimiru2",JSON.stringify({place:st.place,target:st.target}))}catch(e){}};

const night=i=>nightSlots(st.place,i,WEATHER);
const bestHere=(C,s)=>bestFor(C,s,PLACES[st.place]);

function setPlace(i){if(INIT.place!=null&&i!==INIT.place){try{localStorage.setItem("hoshimiru2",JSON.stringify({place:i,target:st.target}))}catch(e){}location.href=`/pref/${PLACES[i].slug}/`;return}st.place=i;st.slot=null;$("loc").value=PLACES[i].label;save();render()}
function setTarget(n){st.target=n;delete $("tcard").dataset.static;save();renderTarget();drawDome()}

function render(){
  const P=PLACES[st.place],slots=night(st.day);st.slots=slots;
  // days
  const UP=upcoming();
  const w=$("days");w.innerHTML="";for(let i=0;i<4;i++){const b=document.createElement("button");const evd=UP.find(e=>e.dd===i);b.textContent=dayLabel(i)+(evd?" ★流星群":"");b.setAttribute("aria-pressed",i===st.day);b.onclick=()=>{st.day=i;st.slot=null;render()};w.appendChild(b)}
  const S=summary(st.place,st.day,WEATHER),best=S.best,il=S.il;
  $("q").textContent=`${dayLabel(st.day)}、${P.label}で星はいつ見える？`;
  $("topday").textContent=dayLabel(st.day);
  $("headline").innerHTML=best?`<em>${windowText(slots,best)}</em> が見頃`:S.head;
  if(st.slot===null){st.slot=best?Math.round((best.a+best.b)/2):slots.findIndex(x=>x.sa<-18);if(st.slot<0)st.slot=8}
  $("why").textContent=S.why;
  // timeline
  const bars=$("bars"),ticks=$("ticks"),rc=$("r-cloud"),rm=$("r-moon");bars.innerHTML=ticks.innerHTML=rc.innerHTML=rm.innerHTML="";
  slots.forEach((x,i)=>{const b=document.createElement("div");b.className="bar"+(i===st.slot?" sel":"");b.style.height=Math.max(3,x.s)+"%";b.style.background=x.s>=60?"var(--good)":x.s>=30?"var(--mid)":"var(--bad)";b.title=`${fmt(x.t)} 見え具合${x.s} 雲${x.cloud==null?"予報なし":Math.round(x.cloud)+"%"}`;b.onclick=()=>{st.slot=i;render()};bars.appendChild(b);
    const tk=document.createElement("span");tk.textContent=i%4===0?fmt(x.t):"";ticks.appendChild(tk);
    const a=document.createElement("div");a.style.background=x.cloud==null?"transparent":`rgba(143,155,179,${x.cloud/100})`;if(x.cloud==null)a.style.border="1px dashed var(--line)";rc.appendChild(a);
    const mm=document.createElement("div");mm.style.background=`rgba(242,200,107,${x.moonLight})`;rm.appendChild(mm)});
  $("slot").value=st.slot;$("slotout").textContent=nx(slots[st.slot].t)+fmt(slots[st.slot].t);
  // visible list
  const list=CONS.filter(C=>!C.mw).map(C=>({C,b:bestHere(C,slots)})).filter(o=>o.b&&o.b.alt>=25).sort((a,b)=>a.b.t-b.b.t);
  $("vishead").textContent=`今夜見やすい星座 ${list.length}個（見頃の時刻順）`;
  const vis=$("vis");vis.innerHTML="";list.forEach(({C,b})=>{const li=document.createElement("li");const bt=document.createElement("button");bt.setAttribute("aria-current",st.target===C.n);
    bt.innerHTML=`<span class="nm">${C.n}<small>${dir(b.az)}の${height(b.alt)}${ease(C,P).ok?"":"・暗い所向き"}</small></span><span class="tm">${nx(b.t)}${fmt(b.t)}<small>ごろ</small></span>`;
    bt.onclick=()=>{st.slot=b.i;setTarget(C.n);render()};li.appendChild(bt);vis.appendChild(li)});
  // moon
  const ph=il.phase,names=[[.03,"新月"],[.22,"三日月"],[.28,"上弦の月"],[.47,"十三夜"],[.53,"満月"],[.72,"寝待月"],[.78,"下弦の月"],[.97,"有明月"],[1.01,"新月"]];
  const up=slots.filter(x=>x.moonLight>0.02);
  // 30日カレンダー
  const[cy,cm,cdd]=jstNow(),cal=$("cal");cal.innerHTML="";const cd=[];
  for(let i=0;i<30;i++){const base=Date.UTC(cy,cm,cdd+i,12,0);const ill=illum(base);
    const dark=ill.f<.12||[0,2,4].every(h=>moonPos(base+h*3600e3,P).alt<0);const dt=new Date(base+9*3600e3);cd.push({i,f:ill.f,dark,dt});
    const el=document.createElement("div");el.className=(dark?"dark ":"")+(dt.getUTCDay()%6===0?"wk":"");el.title=`${dt.getUTCMonth()+1}/${dt.getUTCDate()} 月の輝き${Math.round(ill.f*100)}%${dark?"・暗い夜":""}`;
    const c=document.createElement("canvas");c.width=40;c.height=40;drawMoon(c,ill.phase);el.appendChild(c);
    const lb=document.createElement("span");lb.textContent=(i===0||dt.getUTCDate()===1?(dt.getUTCMonth()+1)+"/":"")+dt.getUTCDate();el.appendChild(lb);
    const w=document.createElement("span");w.textContent=WD[dt.getUTCDay()];el.appendChild(w);cal.appendChild(el)}
  const md=d=>`${d.dt.getUTCMonth()+1}/${d.dt.getUTCDate()}`;
  const nm=cd.slice(1).reduce((a,d)=>d.f<a.f?d:a),fm=cd.slice(1).reduce((a,d)=>d.f>a.f?d:a);
  const nextDark=cd.find(d=>d.dark);let run=null;if(nextDark){let j=nextDark.i;while(j+1<30&&cd[j+1].dark)j++;run=[nextDark,cd[j]]}
  const mdw=d=>`${md(d)}(${WD[d.dt.getUTCDay()]})`;
  $("mooninfo").innerHTML=`<dt>今夜の月</dt><dd class="big">${names.find(([v])=>ph<v)[1]}</dd>
    <dt>明るさ</dt><dd>${Math.round(il.f*100)}%</dd>
    <dt>月が出ている</dt><dd>${up.length?`${fmt(up[0].t)}〜${nx(up[up.length-1].t+1800e3)}${fmt(up[up.length-1].t+1800e3)}`:"一晩中沈んでいる"}</dd>
    <dt>次の新月</dt><dd>${mdw(nm)}</dd><dt>次の満月</dt><dd>${mdw(fm)}</dd>`;
  $("darknext").innerHTML=run?`次の暗い夜は <b>${run[0]===run[1]?mdw(run[0]):`${mdw(run[0])}〜${mdw(run[1])}`}</b><br>天の川や暗い星座を見るならこの日`:"この先30日は月明かりのある夜が続きます";
  drawMoon($("moonc"),ph);
  // events
  const ev=$("events");ev.innerHTML="";renderAlert(UP[0]);
  UP.forEach(e=>{
    const f=illum(e.t+16*3600e3).f,cls=f<.3?["g","月明かり少なめ"]:f<.65?["m","月がやや邪魔"]:["b","月明かり強い"],dd=e.dd,x=new Date(e.t);
    const li=document.createElement("li");li.innerHTML=`<span class="d">${x.getUTCMonth()+1}/${x.getUTCDate()}</span><span class="n"></span><span class="side"><span class="pill ${cls[0]}">${cls[1]}</span><a class="addcal" target="_blank" rel="noopener">カレンダーに追加</a></span>`;
    // Googleカレンダーに追加（当日20:00〜翌5:00、前日に通知はカレンダー側の設定）
    const ymd=t=>new Date(t).toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
    const gcal=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.n)}&dates=${ymd(e.t+11*3600e3)}/${ymd(e.t+20*3600e3)}&details=${encodeURIComponent(e.rate+"。"+e.tip+"\n見頃の時間と方角：${SITE.url}/event/"+e.slug+"/")}`;
    li.querySelector(".n").innerHTML=`<a href="/event/${e.slug}/">${e.n}</a><small>${dd>0?`あと${dd}日・`:"今夜・"}${e.info}</small>`;li.querySelector("a.addcal").href=gcal;ev.appendChild(li)});
  renderTarget();drawDome();
}

const meteorWindow=e=>meteorWindowAt(e,st.place,e.dd,WEATHER);
function renderAlert(e){const box=$("alert");if(!e||e.dd>7){box.hidden=true;return}box.hidden=false;
  const x=new Date(e.t),date=`${x.getUTCMonth()+1}/${x.getUTCDate()}(${WD[x.getUTCDay()]})`;
  if(e.dd<=1){const{best,slots}=meteorWindow(e);const f=illum(e.t+16*3600e3).f;
    const win=best?`${nx(slots[best.a].t)}${fmt(slots[best.a].t)}〜${nx(slots[best.b].t+1800e3)}${fmt(slots[best.b].t+1800e3)}`:null;
    box.className="alert";box.innerHTML=`<span class="eb">${e.dd===0?"今夜":"明日の夜"}・${date}</span><div class="t">${e.dd===0?"今夜は":"明日の夜は"}<em>${e.n}</em></div>
      <div class="d">${PLACES[st.place].p}の見頃は${win?`<strong>${win}</strong>`:"雲が多く厳しそう"}。${e.rate}。月明かりは${f<.3?"少なめで好条件":f<.65?"やや邪魔":"強め"}。${e.tip}</div>
      <button type="button" id="alertgo">流れ星が飛んでくる方向を星図で見る</button>
      ${(window.HM_SHOP||[]).length?`<div class="alertshop"><span class="lbl">持ち物チェック<small>PR</small></span>${HM_SHOP.map(x=>`<a href="${x.href}" target="_blank" rel="sponsored nofollow noopener">${esc(x.n)}</a>`).join("")}<small class="via">（${esc(HM_SHOP[0].shop)}で見る）</small></div>`:""}`;
    $("alertgo").onclick=()=>{st.day=e.dd;st.slot=best?best.peak:null;setTarget(e.c);render();document.getElementById("dome").scrollIntoView({behavior:"smooth",block:"center"})};
  }else{box.className="strip";box.innerHTML=`<span class="cd">あと${e.dd}日</span><span>${date}の夜は<strong>${e.n}</strong>（${e.rate}）</span><button type="button" id="alertgo">準備しておく</button>`;
    $("alertgo").onclick=()=>{setTarget(e.c);document.getElementById("tcard").scrollIntoView({behavior:"smooth",block:"start"})}}
}
function renderTarget(){
  const box=$("tcard"),P=PLACES[st.place];
  // 今夜のおすすめ：街なかでも見えて、今夜いちばん高く上がる星座を5つ
  const picks=CONS.filter(C=>!C.mw&&ease(C,P).ok).map(C=>({C,b:bestHere(C,st.slots)})).filter(o=>o.b&&o.b.alt>=30).sort((a,b)=>b.b.alt*Math.max(.2,b.b.x.s)-a.b.alt*Math.max(.2,a.b.x.s)).slice(0,5);
  const q=$("quick");q.innerHTML=picks.length?`<span class="kv" style="align-self:center">今夜のおすすめ</span>`:"";picks.forEach(({C})=>{const b=document.createElement("button");b.className="chip";b.textContent=C.n;b.onclick=()=>setTarget(C.n);q.appendChild(b)});
  const C=CONS.find(c=>c.n===st.target);
  if(!C){if(box.dataset.static)return;box.innerHTML=`<p class="kv">星座を選ぶと、ここに「今夜の見える時刻と方角」「この先4日でいちばん条件のいい夜」「一年の見頃」が出ます。</p>`;return}
  $("tq").value=C.n;
  const b=bestHere(C,st.slots);
  // 4日間
  const nights=[0,1,2,3].map(i=>{const s=night(i),bb=bestHere(C,s);const sc=bb&&bb.alt>15?Math.round(bb.x.s*Math.min(1,bb.alt/40)):0;return{i,sc,bb}});
  const top=nights.reduce((a,n)=>n.sc>a.sc?n:a,nights[0]);
  // 季節：毎月15日21時の高さ
  const[y]=jstNow();const months=Array.from({length:12},(_,m)=>conPos(Date.UTC(y,m,15,12,0),P,C).alt);
  const maxAlt=90-Math.abs(P.lat-C.de);
  const where=PLACES.filter(p=>90-Math.abs(p.lat-C.de)>2).map(p=>p.p);
  const mcls=a=>maxAlt<20?(a>0&&a>=maxAlt-5?"on":""):(a>=45?"on":a>=20?"ok":"");
  const tonight=maxAlt<=2?`<p class="warn">${P.label}からは、一年を通して地平線より上に出てきません。${where.length?`日本では${where.join("・")}まで南へ行くと、地平線すれすれに見えます。`:"日本からは見られない、南半球の星座です。"}</p>`
    :maxAlt<10?`<p class="warn">${P.p}では一番高く昇っても地平線から${Math.round(maxAlt)}°ほど。南の水平線が開けた海辺で、空気の澄んだ晴れた夜なら見えるチャンスがあります。</p>`
    :b&&b.alt>=15?`<div class="facts">
      <div class="fact"><span class="l">今夜いちばん見やすい時刻</span><span class="v">${nx(b.t)}${fmt(b.t)}ごろ</span></div>
      <div class="fact"><span class="l">方角</span><span class="v">${dir(b.az)}の空</span></div>
      <div class="fact"><span class="l">高さ</span><span class="v">${height(b.alt)}（${Math.round(b.alt)}°）</span></div>
      <div class="fact"><span class="l">その時刻の見え具合</span><span class="v">${b.x.s>=60?"よく見える":b.x.s>=30?"まあまあ":"雲や月で厳しい"}</span></div></div>`
    :`<p>今夜は暗い時間帯に地平線の上に出てきません。見頃の季節は下の表を見てください。</p>`;
  const ez=ease(C,P);
  box.innerHTML=`<h3>${C.short}</h3><div class="kv">${C.star?"目印："+C.star+"・":""}${C.note}</div>
    ${maxAlt>2?`<div class="ease"><span class="pill ${ez.ok?"g":"m"}">${ez.ok?"街なかOK":"暗い所がおすすめ"}</span><span>${ez.t}</span></div>`:""}
    ${figHTML(C)}${tonight}
    <div><div class="fact"><span class="l">この先4日でいちばん条件のいい夜</span></div><div class="nights">${nights.map(n=>`<div class="night${n===top&&n.sc>0?" best":""}"><span class="kv">${dayLabel(n.i)}</span><b>${n.sc>0?n.sc:"—"}</b></div>`).join("")}</div></div>
    <div><div class="fact" style="margin-bottom:6px"><span class="l">一年の見頃（毎月15日の夜9時に見える高さ）</span></div><div class="months">${months.map((a,m)=>`<span class="${mcls(a)}">${m+1}月</span>`).join("")}</div></div>
    ${MYTH[C.n]?`<div class="myth"><div class="fact"><span class="l">${C.mw?"天の川の物語":"星座の物語"}</span></div><p>${MYTH[C.n]}</p></div>`:""}
    ${INIT.target===C.n?"":`<a class="more" href="/seiza/${C.slug}/">${C.short}のページを開く →</a>`}`;
  const fc=$("figc");if(fc)drawFig(fc,C);
  [...document.querySelectorAll(".vis button")].forEach(x=>x.setAttribute("aria-current",x.querySelector(".nm").firstChild.textContent===C.n));
}

function drawFig(cv,C){const F=FIG[C.n],x=cv.getContext("2d"),W=cv.width,H=cv.height;x.clearRect(0,0,W,H);
  const ra0=C.ra,de0=C.de,cd=Math.cos(Math.min(80,Math.abs(de0))*R);
  // 北極星まわりは赤経の差が大きいので、方位等距離で投影
  const pr=s=>{let dh=((s[1]-ra0+36)%24)-12;return[-dh*15*cd,s[2]-de0]};
  let P=F.s.map(pr);if(C.n==="こぐま座"){P=F.s.map(s=>{const r=90-s[2],a=s[1]*15*R;return[-Math.sin(a)*r,-Math.cos(a)*r]})}
  const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
  const pad=70,sc=Math.min((W-2*pad)/Math.max(1,maxx-minx),(H-2*pad)/Math.max(1,maxy-miny));
  const pt=p=>[W/2+(p[0]-(minx+maxx)/2)*sc,H/2-(p[1]-(miny+maxy)/2)*sc];
  x.strokeStyle="rgba(242,200,107,.55)";x.lineWidth=2.5;F.l.forEach(([a,b])=>{const[p1,q1]=pt(P[a]),[p2,q2]=pt(P[b]);x.beginPath();x.moveTo(p1,q1);x.lineTo(p2,q2);x.stroke()});
  F.s.forEach((s,i)=>{const[px,py]=pt(P[i]);const r=Math.max(3,11-s[3]*2.2);const f=FAMOUS[s[0]];
    if(/銀河|すばる|星団|星雲|マゼラン/.test(s[0])){x.fillStyle="rgba(220,215,255,.35)";x.beginPath();x.ellipse(px,py,/銀河|マゼラン/.test(s[0])?30:14,/銀河|マゼラン/.test(s[0])?12:10,-.6,0,7);x.fill()}
    x.fillStyle=f?f[1]:"#eef1f7";x.beginPath();x.arc(px,py,r,0,7);x.fill();
    if(f){x.fillStyle="#eef1f7";x.font="500 22px 'Zen Kaku Gothic New',sans-serif";x.textAlign="center";x.fillText(s[0],px,py+(py<H/2?-r-12:r+24))}});
}
let domeHits=[];
function drawDome(){
  const cv=$("dome"),x=cv.getContext("2d"),W=cv.width,c=W/2,Rr=c-34,P=PLACES[st.place],s=st.slots[st.slot];
  x.clearRect(0,0,W,W);
  const sa=s.sa,skyCol=sa>-6?"#24365a":sa>-12?"#18264a":"#0d1730";
  x.fillStyle=skyCol;x.beginPath();x.arc(c,c,Rr,0,7);x.fill();
  x.strokeStyle="rgba(143,155,179,.25)";x.lineWidth=1.5;[30,60].forEach(a=>{x.beginPath();x.arc(c,c,Rr*(90-a)/90,0,7);x.stroke()});
  x.strokeStyle="rgba(143,155,179,.6)";x.beginPath();x.arc(c,c,Rr,0,7);x.stroke();
  x.fillStyle="#8f9bb3";x.font="500 26px 'Zen Kaku Gothic New',sans-serif";x.textAlign="center";x.textBaseline="middle";
  x.fillText("北",c,16);x.fillText("南",c,W-16);x.fillText("東",17,c);x.fillText("西",W-17,c);
  const pt=(alt,az)=>{const rr=Rr*(90-alt)/90,b=az*R;return[c-Math.sin(b)*rr,c-Math.cos(b)*rr]};
  // 背景の小さな星（固定パターンを天球に張り付け）
  const r=rng(42);for(let i=0;i<260;i++){const ra=r()*24,de=Math.asin(r()*2-1)/R;const p=horiz(s.t,P.lat,P.lng,ra*15*R,de*R);const m=r();if(p.alt<0)continue;const[px,py]=pt(p.alt,p.az);x.fillStyle=`rgba(238,241,247,${(.2+m*.6)*(sa<-12?1:.35)})`;x.fillRect(px,py,m>.9?3:2,m>.9?3:2)}
  domeHits=[];
  // 星座の線と星
  Object.entries(FIG).forEach(([n,F])=>{const sel=st.target===n;const Q=F.s.map(sv=>horiz(s.t,P.lat,P.lng,sv[1]*15*R,sv[2]*R));
    x.strokeStyle=sel?"rgba(242,200,107,.9)":"rgba(160,180,220,.35)";x.lineWidth=sel?3:1.6;
    F.l.forEach(([a,b])=>{if(Q[a].alt<0||Q[b].alt<0)return;const[p1,q1]=pt(Q[a].alt,Q[a].az),[p2,q2]=pt(Q[b].alt,Q[b].az);x.beginPath();x.moveTo(p1,q1);x.lineTo(p2,q2);x.stroke()});
    F.s.forEach((sv,i)=>{if(Q[i].alt<0)return;const[px,py]=pt(Q[i].alt,Q[i].az);x.fillStyle=`rgba(238,241,247,${sa<-12?1:.5})`;x.beginPath();x.arc(px,py,Math.max(1.5,6-sv[3]*1.3),0,7);x.fill()})});
  CONS.forEach(C=>{const p=conPos(s.t,P,C);if(p.alt<0)return;const[px,py]=pt(p.alt,p.az);const sel=st.target===C.n;
    if(C.mw){x.fillStyle=sel?"rgba(242,200,107,.18)":"rgba(238,241,247,.07)";x.beginPath();x.ellipse(px,py,70,34,0,0,7);x.fill()}
    domeHits.push({px,py,n:C.n});
    // 主な星座だけ名前を出す（88個全部だと読めないため）。暗い星座は選んだときだけ
    const major=sel||C.lv<=2;if(!major){x.fillStyle="rgba(143,155,179,.5)";x.beginPath();x.arc(px,py,2.5,0,7);x.fill();return}
    x.fillStyle=sel?"#f2c86b":"#eef1f7";x.beginPath();x.arc(px,py,sel?7:4,0,7);x.fill();
    x.font=(sel?"700 ":"400 ")+(sel?26:21)+"px 'Zen Kaku Gothic New',sans-serif";x.fillStyle=sel?"#f2c86b":"rgba(238,241,247,.85)";
    const label=C.n.replace("（夏の濃い部分）","");x.fillText(label,px,py+(py>W-60?-20:22))});
  const mp=moonPos(s.t,P);if(mp.alt>0){const[px,py]=pt(mp.alt,mp.az);x.fillStyle="#f2e6c4";x.beginPath();x.arc(px,py,13,0,7);x.fill();x.fillStyle="#f2e6c4";x.font="500 20px 'Zen Kaku Gothic New',sans-serif";x.fillText("月",px,py-26)}
  if(sa>-6){x.fillStyle="#eef1f7";x.font="500 24px 'Zen Kaku Gothic New',sans-serif";x.fillText("まだ空が明るい時間です",c,c)}
}
$("dome").addEventListener("click",e=>{const cv=$("dome"),rc=cv.getBoundingClientRect(),k=cv.width/rc.width,mx=(e.clientX-rc.left)*k,my=(e.clientY-rc.top)*k;let b=null,bd=50;domeHits.forEach(h=>{const d=Math.hypot(h.px-mx,h.py-my);if(d<bd){bd=d;b=h}});if(b)setTarget(b.n)});
$("slot").addEventListener("input",e=>{st.slot=+e.target.value;$("slotout").textContent=nx(st.slots[st.slot].t)+fmt(st.slots[st.slot].t);[...document.querySelectorAll(".bar")].forEach((b,i)=>b.classList.toggle("sel",i===st.slot));drawDome()});

function drawMoon(cv,ph){const x=cv.getContext("2d"),W=cv.width,r=W/2-4;x.clearRect(0,0,W,W);x.save();x.translate(W/2,W/2);
  x.fillStyle="#26324a";x.beginPath();x.arc(0,0,r,0,7);x.fill();
  const k=Math.cos(ph*2*Math.PI),waxing=ph<.5;x.fillStyle="#f2e6c4";x.beginPath();x.arc(0,0,r,-Math.PI/2,Math.PI/2,!waxing);x.fill();
  x.fillStyle=k>0?"#26324a":"#f2e6c4";x.beginPath();x.ellipse(0,0,Math.abs(k)*r+.5,r+.5,0,0,7);x.fill();x.restore()}

// 検索ボックス（候補は枠の中だけでスクロール。ページをスクロールしても閉じない）
function combo(input,pop,source,onPick,current){
  let opts=[],act=-1;
  const close=()=>{pop.hidden=true;input.setAttribute("aria-expanded","false");act=-1};
  const draw=()=>{const q=input.value.trim()===current()?"":input.value.trim();const items=source(q);opts=items;pop.innerHTML="";
    if(!items.length){pop.innerHTML=`<div class="empty">「${q.replace(/</g,"")}」は見つかりませんでした</div>`}
    let g=null;items.forEach((it,i)=>{if(it.group!==g){g=it.group;const h=document.createElement("div");h.className="g";h.textContent=g;pop.appendChild(h)}
      const o=document.createElement("div");o.className="o";o.setAttribute("role","option");o.setAttribute("aria-selected",i===act);o.innerHTML=it.label+(it.sub?`<small>${it.sub}</small>`:"");
      o.addEventListener("pointerdown",e=>{e.preventDefault();pick(i)});pop.appendChild(o)});
    pop.hidden=false;input.setAttribute("aria-expanded","true")};
  const pick=i=>{const it=opts[i];if(!it)return;close();input.blur();onPick(it.value)};
  input.addEventListener("focus",()=>{input.select();draw()});
  input.addEventListener("input",()=>{act=-1;draw()});
  input.addEventListener("keydown",e=>{if(pop.hidden&&e.key!=="Escape")draw();
    if(e.key==="ArrowDown"){act=Math.min(opts.length-1,act+1);e.preventDefault()}else if(e.key==="ArrowUp"){act=Math.max(0,act-1);e.preventDefault()}
    else if(e.key==="Enter"){pick(act<0?0:act);e.preventDefault();return}else if(e.key==="Escape"){close();input.value=current();input.blur();return}else return;
    [...pop.querySelectorAll(".o")].forEach((o,i)=>{o.setAttribute("aria-selected",i===act);if(i===act)o.scrollIntoView({block:"nearest"})})});
  input.addEventListener("blur",()=>setTimeout(()=>{close();input.value=current()},120));
}
const norm=s=>s.replace(/[都道府県市座]$/,"");
combo($("loc"),$("locpop"),q=>{const n=norm(q);return PLACES.map((p,i)=>({p,i})).filter(({p})=>!n||p.label.includes(n)||p.region.includes(n)||p.mw.includes(n))
  .map(({p,i})=>({group:p.region,label:p.p,sub:p.c,value:i}))},i=>setPlace(i),()=>PLACES[st.place].label);
const SORDER=["冬の星座","秋の星座","春の星座","夏の星座","一年中見える星座","日本からはほぼ見えない星座"];
combo($("tq"),$("tpop"),q=>{const n=norm(q);const nowS=CONS.filter(C=>!n||C.n.includes(n)||(C.star&&C.star.includes(n))||C.season.includes(n));
  return nowS.sort((a,b)=>SORDER.indexOf(a.season)-SORDER.indexOf(b.season)).map(C=>({group:C.season,label:C.n,sub:C.star,value:C.n}))},n=>setTarget(n),()=>st.target||"");

(function(){const cv=$("bg"),x=cv.getContext("2d");function draw(){cv.width=innerWidth;cv.height=innerHeight;const r=rng(7);for(let i=0;i<180;i++){x.fillStyle=`rgba(238,241,247,${.15+r()*.5})`;x.fillRect(r()*cv.width,r()*cv.height,r()<.1?2:1,r()<.1?2:1)}}draw();addEventListener("resize",draw)})();
$("loc").value=PLACES[st.place].label;
render();
fetch("/data/weather.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(w=>{if(w&&w.places){WEATHER=w;render()}}).catch(()=>{});
fetch("/data/youtube.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(v=>{if(!v||!v.id)return;const box=$("ytbox");if(!box)return;
  box.querySelector(".thumb").innerHTML=`<a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy"></a>`;
  box.querySelector("h3").innerHTML=`<a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">${esc(v.title)}</a>`}).catch(()=>{});
