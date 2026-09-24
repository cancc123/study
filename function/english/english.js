"use strict";
/* ================= 单词背诵 · 主逻辑（类「不背单词」重构版） =================
   词书：词汇表_按文章出现顺序.txt（1506 词 · 按故事《樱日常》情节顺序）→ 按序每日推进
   核心循环：今日任务 = 到期复习 + 新词配额 → 混合卡片流（翻面自评）→ 艾宾浩斯重排
   数据：recs{word→rec} + meta{settings.dailyNew, cursor, dailyLog{date→{n,r}}}
   同步：仅账号（/api/vocab 携带 meta），防抖推送，不落本地盘；支持导出/导入备份
======================================================================= */

/* ---------- 常量 ---------- */
var INT=[1,2,4,7,15,30];
var STR=[0.5,1.2,2.5,5,10,25,45];
var QUIZ_N=20;
var REV_LIMIT=30;                        /* 单轮复习上限 */
var DAY=864e5;

/* ---------- 状态 ---------- */
var recs={},ME=null,syncTimer=null,tab="home";
var BOOK=[],bookReady=false;
var meta={settings:{dailyNew:20},cursor:0,dailyLog:{}};
var sesQ=[],sesIdx=0,sesTotal=0,sesKind="",sesNewDone={},sesRequeue={},sesStat={n:0,r:0},sesWordsTotal=0;
/* 三轮任务制：每词拆 轮1词义选择/轮2带提示/轮3无提示 三个任务随机交错（同词轮次不连续）；sesWordLogs 按词累积各轮 {r,ok,ms} */
var sesRoundT0=0,sesWordLogs={},sesReveal=false,SES_FAST=false;
var quizQ=[],quizIdx=0,quizOk=0,quizNg=[],quizActive=false;

/* ---------- 工具 ---------- */
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function norm(w){return String(w||"").toLowerCase().trim().replace(/\s+/g," ");}
function pad2(x){return (x<10?"0":"")+x;}
function md(ts){var d=new Date(ts);return pad2(d.getMonth()+1)+"-"+pad2(d.getDate());}
function todayStr(offset){var d=new Date(Date.now()+(offset||0)*DAY);return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());}
function seedBy(w){
  if(window.WORD_SEED_MAP){
    if(window.WORD_SEED_MAP[w])return window.WORD_SEED_MAP[w];
    var lo=String(w||"").toLowerCase();
    if(lo!==w&&window.WORD_SEED_MAP[lo])return window.WORD_SEED_MAP[lo];/* 词书专有名词（April 等）→ 种子键全小写 */
  }
  for(var i=0;i<WORD_SEED.length;i++)if(WORD_SEED[i].w===w)return WORD_SEED[i];
  return null;
}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function toast(msg){
  var t=document.createElement("div");t.className="toast";t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(function(){t.style.opacity="0";t.style.transition="opacity .2s";},1400);
  setTimeout(function(){t.remove();},1650);
}
var TTS=("speechSynthesis" in window)&&typeof SpeechSynthesisUtterance==="function";
function speak(w){
  if(!TTS)return;
  try{
    var u=new SpeechSynthesisUtterance(w);u.lang="en-US";u.rate=.85;
    speechSynthesis.cancel();speechSynthesis.speak(u);
  }catch(e){}
}
function speakSen(t){/* 整句朗读：语速略快于单词，句子更流畅 */
  if(!TTS)return;
  try{
    var u=new SpeechSynthesisUtterance(t);u.lang="en-US";u.rate=.9;
    speechSynthesis.cancel();speechSynthesis.speak(u);
  }catch(e){}
}
var SPK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
var DEL_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13h8l1-13"/></svg>';
var BACK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';

/* ---------- 词书（词汇表_按文章出现顺序.txt · 与阅读章节同步推进） ---------- */
function loadBook(){
  if(typeof fetch!=="function"){renderAll();return;}
  fetch("/function/english/词汇表_按文章出现顺序.txt",{credentials:"same-origin"})
    .then(function(r){return r.ok?r.text():Promise.reject(0);})
    .then(function(t){
      BOOK=t.split(/\r?\n/).map(function(s){return s.trim();}).filter(function(s){return /^[a-zA-Z][a-zA-Z' -]{0,39}$/.test(s);});
      bookReady=true;
      renderAll();
    })
    .catch(function(){bookReady=false;renderAll();});
}
/* 词书进度：已学 = recs 中属于词书的词数（游标之前按已越过计） */
function bookLearned(){
  var set=0;
  for(var i=0;i<BOOK.length;i++)if(recs[BOOK[i].toLowerCase()])set++;
  return set;
}
/* 顺序取新词：从游标起跳过已收录词 */
function nextNewWords(n){
  var out=[],i=meta.cursor||0;
  while(i<BOOK.length&&out.length<n){
    var w=BOOK[i].toLowerCase();
    if(!recs[w])out.push({w:w,idx:i});
    i++;
  }
  return out;
}
function advanceCursor(idx){if(idx+1>(meta.cursor||0))meta.cursor=idx+1;}

/* ---------- 每日日志 / 打卡 ---------- */
function todayLog(){
  var k=todayStr();
  if(!meta.dailyLog[k])meta.dailyLog[k]={n:0,r:0};
  return meta.dailyLog[k];
}
function bumpLog(field){
  var l=todayLog();l[field]=(l[field]||0)+1;scheduleSync();
}
function streak(){
  var s=0,off=0;
  var t=meta.dailyLog[todayStr()];
  if(!(t&&(t.n>0||t.r>0)))off=1; /* 今天还没学，从昨天起算 */
  while(off<400){
    var e=meta.dailyLog[todayStr(-off)];
    if(e&&(e.n>0||e.r>0)){s++;off++;}
    else break;
  }
  return s;
}
function last7(){
  var out=[],i,off;
  for(i=6;i>=0;i--){
    off=i;
    var k=todayStr(-off),e=meta.dailyLog[k]||{};
    out.push({k:k,n:e.n||0,r:e.r||0});
  }
  return out;
}

/* ---------- 数据（仅账号 · 不落本地盘） ----------
   recs/meta 只存在于内存，来源是云端 /api/vocab；修改后防抖推回服务器。
   未登录 → 整页登录引导，无法学习。 */
function api(p,opts){
  opts=opts||{};
  opts.credentials="same-origin";
  opts.headers=Object.assign({"Content-Type":"application/json"},opts.headers||{});
  return fetch(p,opts).then(function(r){return r.json().then(function(d){return {status:r.status,data:d};});});
}
function scheduleSync(){
  if(!ME)return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(pushSync,900);
}
function pushSync(){
  if(!ME||typeof fetch!=="function")return;
  api("/api/vocab",{method:"POST",body:JSON.stringify({r:recs,meta:meta})}).catch(function(){});
}
function mergeServer(list,srvMeta){
  /* 兼容两种载荷：GET /api/vocab 返回对象 {w:rec}，测试钩子/旧路径传数组 */
  if(list&&!Array.isArray(list)&&typeof list==="object")list=Object.keys(list).map(function(k){return list[k];});
  if(!Array.isArray(list))list=[];
  var changed=false;
  (list).forEach(function(s){
    var lo=recs[s.w];
    if(!lo||((s.last||0)>(lo.last||0))){recs[s.w]=s;changed=true;}
  });
  if(srvMeta){
    if((+srvMeta.cursor||0)>(meta.cursor||0)){meta.cursor=+srvMeta.cursor;changed=true;}
    if(srvMeta.settings&&+srvMeta.settings.dailyNew){meta.settings.dailyNew=+srvMeta.settings.dailyNew;}
    var dl=srvMeta.dailyLog||{};
    for(var k in dl){
      if(!meta.dailyLog[k]){meta.dailyLog[k]=dl[k];changed=true;}
      else{
        var a=meta.dailyLog[k],b=dl[k];
        if((+b.n||0)> (+a.n||0)||(+b.r||0)>(+a.r||0)){meta.dailyLog[k]={n:Math.max(+a.n||0,+b.n||0),r:Math.max(+a.r||0,+b.r||0)};changed=true;}
      }
    }
  }
  if(changed)renderAll();
}

/* ---------- 词操作 ---------- */
function delWord(w){
  if(!recs[w])return;
  delete recs[w];scheduleSync();
}
/* grade: 2=认识 1=模糊 0=不认识；新词首次评分前先建词目 */
function ensureRec(w){
  if(recs[w])return recs[w];
  var sd=seedBy(w);
  var r=sd?
    {w:w,ipa:sd.ipa,pos:sd.pos,zh:sd.zh,ex:sd.ex,exZh:sd.exZh,seed:1}:
    {w:w,pos:"",zh:"",ex:"",exZh:"",seed:0};
  r.stage=0;r.due=Date.now();r.added=Date.now();r.last=0;r.ok=0;r.ng=0;
  recs[w]=r;
  return r;
}
function grade(w,g,ts){
  var r=recs[w];if(!r)return;
  ts=ts||Date.now();
  if(g===2){r.stage=Math.min(r.stage+1,6);r.due=ts+INT[Math.min(Math.max(r.stage-1,0),INT.length-1)]*DAY;r.ok++;}
  else if(g===1){r.due=ts+DAY;r.ok++;}
  else{r.stage=0;r.due=ts+10*60*1000;r.ng++;}
  r.last=ts;scheduleSync();
}
function dueCount(){var n=0,t=Date.now();for(var k in recs)if(recs[k].due<=t)n++;return n;}
function strongCount(){var n=0;for(var k in recs)if(recs[k].stage>=6)n++;return n;}
function total(){return Object.keys(recs).length;}
function dueTomorrow(){
  var lim=Date.now()+DAY,base=Date.now(),n=0;
  for(var k in recs)if(recs[k].due>base&&recs[k].due<=lim)n++;
  return n;
}
function zhOf(r){return r?(r.uZh||r.zh||""):"";}

/* ---------- 页签 ---------- */
function switchTab(name){
  if(!ME){tab="home";renderLoginGate();return;}
  tab=name;
  ["home","lib","read","stats","study","quiz"].forEach(function(t){
    document.getElementById("tab-"+t).hidden=(t!==name);
  });
  document.getElementById("etabs").hidden=(name==="study"||name==="quiz");
  document.body.classList.toggle("immersive",name==="study"||name==="quiz");
  var bs=document.querySelectorAll("#etabs button");
  for(var i=0;i<bs.length;i++)bs[i].classList.toggle("on",bs[i].getAttribute("data-tab")===name);
  if(name==="home")renderHome();
  if(name==="stats")renderStats();
  if(name==="lib")renderLib();
  if(name==="read"&&window.__reading)window.__reading.show();
  if(name==="quiz"&&!quizActive&&!document.getElementById("quizBox").firstChild)renderQuizIntro();
}
(function(){
  var bs=document.querySelectorAll("#etabs button");
  for(var i=0;i<bs.length;i++)bs[i].addEventListener("click",function(){switchTab(this.getAttribute("data-tab"));});
})();

/* ---------- 同学已背单词（首页 · 每 60s 刷新 · 头像列表） ---------- */
function loadVmates(){
  var box=document.getElementById("vmates");
  if(!box)return;
  if(!ME){box.hidden=true;box.innerHTML="";return;}
  if(typeof fetch!=="function")return;
  fetch("/api/users",{credentials:"same-origin"}).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d||!d.users)return;
    var us=d.users.slice().sort(function(a,b){return (b.vc||0)-(a.vc||0);});
    var mx=1,i;
    for(i=0;i<us.length;i++)mx=Math.max(mx,us[i].vc||0);
    box.hidden=false;
    box.innerHTML='<div class="vm-head"><h3>同学已背单词</h3><span class="vm-sub">MATES · 共 '+us.length+' 人</span></div><div class="vm-list">'
      +us.map(function(u,i){
        var self=ME&&u.username===ME.username;
        var ava=u.avatar
          ?'<img src="/api/avatar/'+encodeURIComponent(u.username)+'?v='+Math.floor((u.updatedAt||0)/1000)+'" alt="">'
          :esc((u.displayName||"?").charAt(0));
        return '<div class="vm-item'+(self?" self":"")+'" style="--i:'+i+'" title="'+esc(u.displayName)+' 已背 '+(u.vc||0)+' 词">'
          +'<span class="ava">'+ava+'</span>'
          +'<span class="vm-name">'+esc(u.displayName)+(self?"<i>我</i>":"")+'</span>'
          +'<span class="vm-bar"><i data-w="'+(((u.vc||0)/mx)).toFixed(3)+'"></i></span>'
          +'<b class="vm-num">'+(u.vc||0)+'<em>词</em></b>'
          +'</div>';
      }).join("")+"</div>";
    requestAnimationFrame(function(){
      var bars=box.querySelectorAll(".vm-bar i");
      for(i=0;i<bars.length;i++)bars[i].style.transform="scaleX("+bars[i].getAttribute("data-w")+")";
    });
  }).catch(function(){});
}
function renderHome(){
  var el=document.getElementById("homeBox");
  if(!el)return;
  var learned=bookLearned(),tt=total();
  var pct=BOOK.length?learned/BOOK.length:(tt?1:0);
  var R=52,C=2*Math.PI*R;
  var today=meta.dailyLog[todayStr()]||{n:0,r:0};
  var remainNew=Math.max(meta.settings.dailyNew-(today.n||0),0);
  var due=dueCount();
  var sk=streak();
  /* 7 日迷你柱状 */
  var bars="",l7=last7(),mx=1,i;
  for(i=0;i<7;i++)mx=Math.max(mx,l7[i].n+l7[i].r);
  for(i=0;i<7;i++){
    var v=l7[i].n+l7[i].r,h=Math.round(v/mx*100);
    bars+='<div class="hbar'+(i===6?" now":"")+'" title="'+l7[i].k.slice(5)+' · 新词 '+l7[i].n+' / 复习 '+l7[i].r+'"><i style="height:'+Math.max(h,v?8:2)+'%"></i><span>'+v+'</span></div>';
  }
  var head='<div class="home-top">'
    +'<div class="ring-lg" role="img" aria-label="词书进度">'
    +'<svg viewBox="0 0 120 120"><circle class="ring-track" cx="60" cy="60" r="'+R+'" fill="none" stroke-width="9"/>'
    +'<circle class="ring-fg" cx="60" cy="60" r="'+R+'" fill="none" stroke="#b0342c" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*(1-pct)).toFixed(1)+'" transform="rotate(-90 60 60)"/></svg>'
    +'<b>'+(BOOK.length?Math.round(pct*100)+"%":"—")+'</b><span>已学 '+learned+' / '+BOOK.length+'</span></div>'
    +'<div class="home-side"><div class="kpi"><b>'+sk+'</b><span>连续天数</span></div><div class="kpi"><b>'+strongCount()+'</b><span>已巩固</span></div><div class="kpi"><b>'+(bookReady&&meta.settings.dailyNew?Math.max(Math.ceil((BOOK.length-learned)/Math.max(meta.settings.dailyNew,1)),0):"—")+'</b><span>天完成词书</span></div></div>'
    +'</div>';
  var task;
  if(!ME&&!tt){
    task='<div class="task-card"><div class="tc-title">开始你的第一天</div><p class="hint-line">每日学习新词 + 按艾宾浩斯曲线复习，登录后多端同步。</p>'
      +'<div class="tc-ops"><button type="button" class="pbtn" id="startLearn"'+(bookReady?"":" disabled")+'>今日学习单词</button><a class="gbtn" href="/login.html">登录</a></div></div>';
  }else{
    task='<div class="task-card"><div class="tc-title">今日任务 · '+todayStr().slice(5)+'</div>'
      +'<div class="tc-grid"><div class="tc-item"><b>'+remainNew+'</b><span>新词待学</span></div><div class="tc-item'+(due?" hot":"")+'"><b>'+due+'</b><span>待复习</span></div><div class="tc-item"><b>'+(today.n||0)+" / "+(today.r||0)+'</b><span>已学新词 / 已复习</span></div></div>'
      +'<div class="tc-ops"><button type="button" class="pbtn" id="startLearn"'+((!bookReady&&!tt)?" disabled":"")+'>'+(due||remainNew?"今日学习单词":"今日已完成 · 加练")+'</button>'
      +(due?'<button type="button" class="gbtn" id="startReview">复习 '+due+'</button>':"")
      +'<button type="button" class="gbtn" id="startQuizBtn">随机默写</button></div>'
      +(dueTomorrow()?'<p class="hint-line">明天将有 '+dueTomorrow()+' 个单词到期复习</p>':"")
      +(!bookReady&&tt?'<p class="hint-line">词书加载失败，本次仅可复习与默写</p>':"")
      +'</div>';
  }
  var book='<div class="panel slim"><h3>SETTING / 每日新词量</h3><div class="setrow" id="dailyNewRow">'
    +[10,15,20,25,30].map(function(v){return '<button type="button" data-dn="'+v+'"'+(meta.settings.dailyNew===v?' class="on"':"")+'>'+v+"</button>";}).join("")
    +'</div><div class="setrow2"><button type="button" class="gbtn" id="exportBtn">导出备份</button><label class="gbtn filebtn">导入备份<input type="file" id="importFile" accept="application/json,.json" hidden></label></div></div>';
  el.innerHTML=head+task+'<div class="panel slim"><h3>LAST 7 DAYS / 近 7 日学习量</h3><div class="heat">'+bars+'</div></div>'+book;
  document.getElementById("startLearn").addEventListener("click",function(){switchTab("study");startSession();});
  var rb=document.getElementById("startReview");
  if(rb)rb.addEventListener("click",function(){switchTab("study");startSession(true);});
  var qb=document.getElementById("startQuizBtn");
  if(qb)qb.addEventListener("click",function(){switchTab("quiz");startQuiz();});
  document.getElementById("exportBtn").addEventListener("click",exportBackup);
  document.getElementById("importFile").addEventListener("change",importBackup);
  var dnRow=document.getElementById("dailyNewRow");
  dnRow.addEventListener("click",function(e){
    var b=e.target.closest("[data-dn]");
    if(!b)return;
    meta.settings.dailyNew=+b.getAttribute("data-dn");
    scheduleSync();renderHome();
  });
  loadVmates();/* 同学已背单词（首页） */
}

/* ---------- 学习流（复习 + 新词混合 · 三轮任务随机交错） ---------- */
/* 词 → 任务链：有释义可比对拆三轮任务；无释义/自定义仅一个翻面任务 */
function pushWordTasks(w,kind,idx,rk){
  var r0=recs[w]||seedBy(w),z0=zhOf(r0);
  var tri=!!z0&&z0.indexOf("（自定义")!==0,n=tri?3:1;
  for(var i=1;i<=n;i++){var t={w:w,kind:kind,r:i};if(idx!=null)t.idx=idx;if(rk)t.rk=1;sesQ.push(t);}
}
/* 任务随机交错：保持同词轮次先后，且相邻任务不同词（对齐不背单词的穿插节奏） */
function interleaveTasks(list){
  var chains={},words=[];
  list.forEach(function(t){if(!chains[t.w]){chains[t.w]=[];words.push(t.w);}chains[t.w].push(t);});
  var out=[],prev=null;
  while(words.length){
    var pool=words.filter(function(x){return x!==prev;});
    if(!pool.length)pool=words;
    /* 优先消耗剩余任务最多的词（并列随机）：保持各词进度均衡，避免个别词被留到最后连发 */
    var mx=0;pool.forEach(function(x){if(chains[x].length>mx)mx=chains[x].length;});
    var top=pool.filter(function(x){return chains[x].length===mx;});
    var w=top[Math.floor(Math.random()*top.length)];
    out.push(chains[w].shift());
    prev=w;
    if(!chains[w].length)words.splice(words.indexOf(w),1);
  }
  return out;
}
function startSession(revOnly){/* revOnly=纯复习（不带今日新词） */
  var t=Date.now(),reviews=[];
  for(var k in recs)if(recs[k].due<=t)reviews.push(recs[k]);
  reviews.sort(function(a,b){return a.due-b.due;});
  reviews=reviews.slice(0,REV_LIMIT).map(function(r){return r.w;});
  var today=meta.dailyLog[todayStr()]||{n:0};
  var newQuota=Math.max(meta.settings.dailyNew-(today.n||0),0);
  var fresh=(!revOnly&&bookReady)?nextNewWords(newQuota):[];
  sesQ=[];
  reviews.forEach(function(w){pushWordTasks(w,"rev");});
  fresh.forEach(function(o){pushWordTasks(o.w,"new",o.idx);});
  sesQ=interleaveTasks(sesQ);
  sesIdx=0;sesTotal=sesQ.length;sesKind="";sesNewDone={};sesRequeue={};sesStat={n:0,r:0};
  sesWordsTotal=(function(){var s={},n=0;sesQ.forEach(function(x){if(!s[x.w]){s[x.w]=1;n++;}});return n;})();
  sesWordLogs={};sesReveal=false;
  renderSession();
}
function renderSession(){
  var box=document.getElementById("studyBox");
  if(!sesTotal){
    box.innerHTML='<div class="empty">'+(total()?"今天没有待学的任务——可去「默写」加练，或明天再来。":"点击「开始学习」从词书第一课开始。")+'<div class="center-actions"><button type="button" class="gbtn" id="sesBack">返回今日</button></div></div>';
    var bk=document.getElementById("sesBack");
    if(bk)bk.addEventListener("click",function(){switchTab("home");});
    return;
  }
  if(sesIdx>=sesQ.length){
    box.innerHTML='<div class="revdone"><div class="big">DONE</div><p>本轮完成 · 新词 '+sesStat.n+' · 复习 '+sesStat.r+'</p>'
      +'<p class="hint-line">全部按艾宾浩斯曲线排入了复习计划</p>'
      +'<div class="fgrades"><button type="button" class="pbtn" id="sesAgain">继续学</button><button type="button" class="gbtn" id="sesHome">返回今日</button></div></div>';
    document.getElementById("sesAgain").addEventListener("click",startSession);
    document.getElementById("sesHome").addEventListener("click",function(){switchTab("home");});
    scheduleSync();
    return;
  }
  var item=sesQ[sesIdx],w=item.w,r=recs[w]||seedBy(w),isNew=item.kind==="new";/* 正面音标：新词未建词目时取种子 */
  var zh0=zhOf(r),tri=!!zh0&&zh0.indexOf("（自定义")!==0;/* 有释义 → 三轮制；无释义/自定义 → 单面翻页兜底 */
  box.innerHTML='<div class="stopbar">'
    +'<button type="button" class="sback" id="sesExit" aria-label="退出学习">'+BACK_SVG+'</button>'
    +'<div class="sprog" role="progressbar" aria-valuemin="0" aria-valuemax="'+sesTotal+'" aria-valuenow="'+(sesIdx+1)+'"><i style="width:'+(sesIdx/sesTotal*100).toFixed(1)+'%"></i></div>'
    +'<span class="scount">'+Math.min(sesStat.n+sesStat.r+1,sesWordsTotal||sesTotal)+" / "+(sesWordsTotal||sesTotal)+'</span>'
    +'<span class="tag '+(isNew?"tag-new":"tag-rev")+'">'+(isNew?"新词":"复习")+'</span>'
    +'</div>'
    +'<div class="fcard" data-w="'+esc(w)+'" data-kind="'+(isNew?"new":"rev")+'"'+(item.idx!=null?' data-idx="'+item.idx+'"':"")+' data-mode="'+(tri?"tri":"legacy")+'">'
    +'<div class="fword">'+esc(w)
    +'<span class="rdots" id="rdots" hidden><i></i><i></i><i></i></span>'
    +'<span class="iparow"><span class="acc">美</span><button type="button" class="spk'+(TTS?"":" off")+'" data-spk="'+esc(w)+'" aria-label="朗读">'+SPK_SVG+'</button>'+(r&&r.ipa?'<span class="ipa">'+esc(r.ipa)+'</span>':'')+'</span>'
    +'</div>'
    +'<div class="frev-body" id="frevBody"></div>'
    +'<div class="fops2" id="fops2" hidden></div>'
    +'<div class="fnext" id="fnext" hidden></div>'
    +'<div class="fgrades" id="fgrades" hidden>'
    +'<button type="button" class="no" data-g="0">没印象</button>'
    +'<button type="button" class="mid" data-g="1">模糊</button>'
    +'<button type="button" class="yes" data-g="2">认识</button>'
    +'</div></div>';
  var ex=document.getElementById("sesExit");
  if(ex)ex.addEventListener("click",function(){switchTab("home");});
  sesReveal=false;
  renderRound();
}
/* ---------- 三轮制学习流 ----------
   轮1 词义四选一 → 轮2 带提示句「认识/不认识」（选择后展开详解：释义+例句+词组搭配）
   → 轮3 无提示「认识/不认识」（选择后展示提示句+词组搭配）。
   各轮记录 {r:轮次, ok:是否答对, ms:反应毫秒} 存入词条 rounds，随云端同步，
   用于后续生成针对性复习计划。无释义可比对的词（未收录/自定义）保留单面翻页兜底。 */
function boldWord(t,w){/* 例句/提示句词级化：每词包 .fexw（悬浮释义+点击发声），目标词及词形加粗 */
  var out="",li=0,re=/[A-Za-z][A-Za-z'’-]*/g,m;
  var rx=new RegExp("^"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\w*$","i");
  while((m=re.exec(t))){
    out+=esc(t.slice(li,m.index));
    var wd=m[0];
    out+='<span class="fexw" data-w="'+esc(wd)+'">'+(rx.test(wd)?"<b>"+esc(wd)+"</b>":esc(wd))+"</span>";
    li=m.index+wd.length;
  }
  return out+esc(t.slice(li));
}
var fexpopEl=null;
function fexpopShow(el){/* 例句词气泡：内容（复用阅读页 lookup 词形还原）+ 词上方定位 */
  if(!fexpopEl){fexpopEl=document.createElement("div");fexpopEl.id="fexpop";fexpopEl.hidden=true;document.body.appendChild(fexpopEl);}
  var raw=el.getAttribute("data-w")||"";
  var hit=window.__reading&&window.__reading.lookup?window.__reading.lookup(raw):null;
  if(hit&&hit.rec){
    fexpopEl.innerHTML='<b class="fp-w">'+esc(hit.rec.w||hit.base)+"</b>"
      +(hit.rec.ipa?'<i class="fp-ipa">'+esc(hit.rec.ipa)+"</i>":"")
      +(hit.rec.pos?'<i class="fp-pos">'+esc(hit.rec.pos)+"</i>":"");
    var rows=posZhRows(hit.rec.pos,hit.rec.zh);
    if(rows){/* 竖排：名词一行、动词一行（与详解区同款配对；不齐时每组一行） */
      fexpopEl.innerHTML+='<div class="fp-rows">'+rows.map(function(r2){
        return '<div class="fp-row2">'+(r2.pos?'<span class="fp-pos">'+esc(r2.pos)+"</span>":"")+'<span class="fp-zh">'+esc(r2.zh)+"</span></div>";
      }).join("")+"</div>";
    }else{
      fexpopEl.innerHTML+='<div class="fp-zh">'+esc(hit.rec.zh||"（无释义）")+"</div>";
    }
  }else{
    fexpopEl.innerHTML='<b class="fp-w">'+esc(raw)+'</b><div class="fp-zh">尚未收录释义</div>';
  }
  fexpopEl.hidden=false;
  var r=el.getBoundingClientRect();
  fexpopEl.style.left=Math.max(8,(r.left+r.width/2))+"px";
  fexpopEl.style.top=Math.max(8,r.top)+"px";
}
function fexpopHide(){if(fexpopEl)fexpopEl.hidden=true;}
function roundDots(r){/* 词头右侧轮次圆点：已完成绿 / 当前亮（r=当前任务轮次） */
  var d=document.getElementById("rdots");
  if(!d)return;
  d.hidden=false;
  var is=d.querySelectorAll("i");
  for(var i=0;i<is.length;i++)is[i].className=(i+1<r?"done":(i+1===r?"on":""));
}
function exCard(en,zh,w){/* 例句卡：整句喇叭 + 目标词加粗 + 译文（可空） */
  return '<div class="fex"><button type="button" class="spk fex-spk" data-spksen="'+esc(en)+'" aria-label="朗读例句">'+SPK_SVG+'</button><span class="fex-t" data-spksen="'+esc(en)+'">'+boldWord(en,w)+"</span>"
    +(zh?'<div class="fexzh">'+esc(zh)+"</div>":"")+"</div>";
}
function phraseCard(w){/* 词组搭配卡（phrases-data.js 未收录的词自动隐藏） */
  var p=window.WORD_PHRASES?(window.WORD_PHRASES[w]||window.WORD_PHRASES[String(w).toLowerCase()]):null;
  if(!p||!p.length)return "";
  return '<div class="fphrase"><div class="fp-title">词组搭配</div>'+p.slice(0,5).map(function(it){
    return '<div class="fp-row"><span class="fp-en">'+esc(it[0])+'</span><span class="fp-zh">'+esc(it[1]||"")+"</span></div>";
  }).join("")+"</div>";
}
function splitEnSents(p){/* 英文段落切句：常见称谓缩写占位防误切 */
  var prot=String(p).replace(/\s+/g," ").replace(/\b(Mr|Mrs|Ms|Dr|St|Mt|Prof)\./g,"$1\u0001");
  var a=prot.match(/[^.!?]+[.!?]+["”’']?/g)||[];
  return a.map(function(s){return s.replace(/\u0001/g,".").trim();}).filter(Boolean);
}
function splitZhSents(p){/* 中文段落切句（句末标点，收尾引号并入句） */
  return (String(p).match(/[^。！？]+[。！？]+["”』]?/g)||[]).map(function(s){return s.trim();}).filter(Boolean);
}
function alignParaZh(enPara,enSent,zhPara){/* 英文句 → 段落译文里的对应中文句：
  单调 DP（长度占比最小代价），允许 2 英句↔1 中句 / 1↔2（引号对话两侧切分粒度常不同） */
  var es=splitEnSents(enPara),zs=splitZhSents(zhPara),E=es.length,Z=zs.length;
  if(!E||!Z)return "";
  var t=String(enSent).replace(/\s+/g," ").trim(),idx=-1,i,j;
  for(i=0;i<E;i++)if(es[i]===t){idx=i;break;}
  if(idx<0)return "";
  var MISS_PEN=0.5,le=es.map(function(s){return s.length;}),lz=zs.map(function(s){return s.length;}),se=0,sz=0;
  for(i=0;i<E;i++)se+=le[i];for(j=0;j<Z;j++)sz+=lz[j];
  function pc(a,b){var x=0,y=0,k;for(k=0;k<a.length;k++)x+=le[a[k]];for(k=0;k<b.length;k++)y+=lz[b[k]];return Math.abs(x/se-y/sz);}
  var INF=1e9,dp=[],bk=[];
  for(i=0;i<=E;i++){dp.push(new Array(Z+1).fill(INF));bk.push(new Array(Z+1).fill(null));}
  dp[0][0]=0;
  function step(ni,nj,kind,i2,j2){var c=kind==="11"?pc([i2],[j2]):kind==="21"?pc([i2,i2+1],[j2]):kind==="12"?pc([i2],[j2,j2+1]):MISS_PEN;
    if(dp[ni][nj]>dp[i2][j2]+c){dp[ni][nj]=dp[i2][j2]+c;bk[ni][nj]=[i2,j2,kind];}}
  for(i=0;i<=E;i++)for(j=0;j<=Z;j++){
    if(dp[i][j]>=INF)continue;
    if(i<E&&j<Z)step(i+1,j+1,"11",i,j);
    if(i+1<E&&j<Z)step(i+2,j+1,"21",i,j);
    if(i<E&&j+1<Z)step(i+1,j+2,"12",i,j);
    if(i<E)step(i+1,j,"e0",i,j);
    if(j<Z)step(i,j+1,"z0",i,j);
  }
  var map=es.map(function(){return [];});
  i=E;j=Z;
  while(i>0||j>0){var bk2=bk[i][j];if(!bk2)break;
    if(bk2[2]==="11")map[bk2[0]].push(bk2[1]);
    else if(bk2[2]==="21"){map[bk2[0]].push(bk2[1]);map[bk2[0]+1].push(bk2[1]);}
    else if(bk2[2]==="12")map[bk2[0]].push(bk2[1],bk2[1]+1);
    i=bk2[0];j=bk2[1];}
  return map[idx].sort(function(a,b){return a-b;}).map(function(k){return zs[k];}).join(" ");
}
function findArticleExBoth(w){/* 从《樱日常》语料检索含该词（含词形变化）的句子：{en:句子, zh:该句的中文翻译} */
  if(!window.READING_ARTICLES)return null;
  var b=String(w||""),forms=[b],i,seen={},fset=[];
  forms.push(b+"s",b+"es",b+"ed",b+"d",b+"ing");
  if(/e$/.test(b))forms.push(b.slice(0,-1)+"ing");
  if(/[^aeiou][aeiou][b-df-gj-np-tv-z]$/.test(b)&&b.length>=3)forms.push(b+b.charAt(b.length-1)+"ing",b+b.charAt(b.length-1)+"ed");
  if(/y$/.test(b))forms.push(b.slice(0,-1)+"ies",b.slice(0,-1)+"ied");
  if(b.length>3)forms.push(b.replace(/(?:ing|ed|s)$/,""),b.replace(/(?:es|d)$/,""));
  for(i=0;i<forms.length;i++){var f=forms[i];if(f&&!seen[f.toLowerCase()]){seen[f.toLowerCase()]=1;fset.push(f);}}
  var rx=new RegExp("\\b("+fset.map(function(f){return f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}).join("|")+")\\b","i");
  for(i=0;i<READING_ARTICLES.length;i++){
    var art=READING_ARTICLES[i];if(!art||!art.text)continue;
    var paras=String(art.text).split(/\n\s*\n/);/* 与 reading.js 分段一致 → 段落译文按索引对齐 */
    for(var p=0;p<paras.length;p++){
      var sents=(paras[p]||"").replace(/\n+/g," ").match(/[^.!?]+[.!?]+/g)||[];
      for(var j=0;j<sents.length;j++){
        var s=sents[j].trim();
        if(s.length>=18&&s.length<=170&&rx.test(s)){
          var trs=(window.READING_TRANSLATIONS||{})[art.id]||[];
          return {en:s,zh:alignParaZh(paras[p],s,trs[p]||"")};
        }
      }
    }
  }
  return null;
}
function findArticleEx(w){var o=findArticleExBoth(w);return o?o.en:null;}
function renderRound(){
  var card=document.querySelector("#studyBox .fcard");
  if(!card)return;
  var tr=(sesQ[sesIdx]||{}).r||1;/* 当前任务轮次（1 词义选择 / 2 带提示 / 3 无提示） */
  var w=card.getAttribute("data-w"),r=recs[w]||{};
  var sd=seedBy(w);/* 新词未建词目：释义/例句先从种子词库回填显示 */
  if(!zhOf(r)&&sd){r.ipa=r.ipa||sd.ipa;r.pos=r.pos||sd.pos;r.zh=r.zh||sd.zh;r.ex=r.ex||sd.ex;r.exZh=r.exZh||sd.exZh;}
  var zh=zhOf(r);
  var body=document.getElementById("frevBody"),ops2=document.getElementById("fops2"),nx=document.getElementById("fnext"),gr=document.getElementById("fgrades");
  body.innerHTML="";ops2.innerHTML="";ops2.hidden=true;nx.innerHTML="";nx.hidden=true;gr.hidden=true;
  if(!zh||zh.indexOf("（自定义")===0){renderLegacy(card,w,body,gr);return;}
  if(!sesReveal){
    if(tr===1)round1Face(w,r,body);
    else if(tr===2)round2Face(w,r,body);
    else round3Face(body,tr);
    if(tr>1){
      ops2.innerHTML='<button type="button" class="fbtn yes" data-k="1">认识<i></i></button><button type="button" class="fbtn no" data-k="0">不认识<i></i></button>';
      ops2.hidden=false;
    }
  }else if(tr===1)round1Reveal(w,r,zh,tr);
  else if(tr===2)round2Reveal(w,r,zh,tr);
  else round3Reveal(w,r,tr);
}
function round1Face(w,r,body){/* 轮1 · 词义四选一 */
  roundDots(1);sesRoundT0=Date.now();
  body.innerHTML='<div class="fopts">'+pickOpts(w,r).map(function(o){
      return '<button type="button" class="fopt" data-ok="'+(o.ok?"1":"0")+'"><span class="pos">'+esc(o.pos)+'</span><span class="ozh">'+esc(o.zh)+'</span></button>';
    }).join("")+'</div>'
    +'<div class="fskipwrap"><button type="button" class="fskip" id="fskip">看答案</button></div>';
}
function round2Face(w,r,body){/* 轮2 · 带提示句识别：释义以模糊条占位 */
  roundDots(2);sesRoundT0=Date.now();
  var hint=r.ex||findArticleEx(w)||"";
  body.innerHTML='<div class="fblur" aria-hidden="true"><i></i><i></i></div>'
    +(hint?'<div class="fex hintex"><button type="button" class="spk" data-spksen="'+esc(hint)+'" aria-label="朗读提示句">'+SPK_SVG+'</button><span class="fex-t" data-spksen="'+esc(hint)+'">'+boldWord(hint,w)+"</span></div>":"");
}
function round3Face(body,r){/* 轮3 · 无提示识别 */
  roundDots(r||3);sesRoundT0=Date.now();
  body.innerHTML='<div class="lastgate">本词最后一关：请在无提示的情况下判断</div>';
}
function posZhRows(pos,zh){/* 词性×「；」组→竖排行：每组一行、行首带词性（第 i 行=第 i 段词性+第 i 组释义），多出的释义组截断为行尾「……」；单词性共享词性；无词性省略标；上限 3 行 */
  var tags=String(pos||"").split("/").map(function(s){return s.trim();}).filter(Boolean);
  var groups=String(zh||"").split("；").map(function(s){return s.trim();}).filter(Boolean);
  if(!groups.length)return null;
  var MAX=3,rows=[],i,n;
  if(tags.length>1){
    n=Math.min(tags.length,groups.length);
    for(i=0;i<n;i++)rows.push({pos:tags[i],zh:groups[i]+((i===n-1&&groups.length>tags.length)?"……":"")});
  }else{
    var p=tags[0]||"";
    rows=groups.map(function(g){return {pos:p,zh:g};});
    if(rows.length>MAX){rows=rows.slice(0,MAX);rows[MAX-1].zh+="……";}
  }
  return rows;
}
function fzhHtml(pos,zh){/* 释义竖排：每行一词性/一义项组（组数不符也多行，杜绝一大串） */
  var rows=posZhRows(pos,zh);
  if(rows){
    return '<div class="fzh">'+rows.map(function(r2){
      return '<div class="frow">'+(r2.pos?'<span class="pos">'+esc(r2.pos)+"</span>":"")+'<span class="fzh-t">'+esc(r2.zh)+"</span></div>";
    }).join("")+"</div>";
  }
  return '<div class="fzh"><span class="pos">'+esc(pos||"")+'</span>'+esc(zh||"")+"</div>";
}
function revealBody(w,r,zh){/* 详解主体：释义竖排 + 例句（种子带译文 + 文章语料带段落译文）+ 词组搭配 */
  var exes=r.ex?exCard(r.ex,r.exZh,w):"";
  var ae=findArticleExBoth(w);
  if(ae&&ae.en&&ae.en!==r.ex)exes+=exCard(ae.en,ae.zh,w);
  return fzhHtml(r.pos,zh)+exes+phraseCard(w);
}
function round1Reveal(w,r,zh,tr){/* 轮1 选择后详解（仅「下一词」） */
  roundDots(tr||1);
  document.getElementById("frevBody").innerHTML=revealBody(w,r,zh);
  showNext(false);
}
function round2Reveal(w,r,zh,tr){/* 轮2 选择后详解：释义 + 例句 + 词组搭配（「下一词 / 记错了」） */
  roundDots(tr||2);
  document.getElementById("frevBody").innerHTML=revealBody(w,r,zh);
  showNext(true);
}
function round3Reveal(w,r,tr){/* 轮3 选择后：提示句 + 词组搭配 */
  roundDots(tr||3);
  var hint=r.ex||findArticleEx(w)||"";
  document.getElementById("frevBody").innerHTML=(hint?exCard(hint,"",w):"")+phraseCard(w)
    +'<div class="hint-line center-hint">以上是本词的提示句与常用词组</div>';
  showNext(false);
}
function showNext(withAgain){
  var nx=document.getElementById("fnext");
  nx.innerHTML='<button type="button" class="fskip" data-next="1">下一词</button>'
    +(withAgain?'<button type="button" class="fskip" data-again="1">记错了</button>':"");
  nx.hidden=false;
}
function renderLegacy(card,w,body,gr){/* 兜底：无释义可比对（未收录/自定义）→ 单面翻页自评 */
  var d=document.getElementById("rdots");if(d)d.hidden=true;
  sesRoundT0=Date.now();
  if(!sesReveal){
    body.innerHTML='<div class="hint-line">'+(card.getAttribute("data-kind")==="new"?"想一想它的意思，再翻面核对":"先回忆，再翻面核对")+'</div>';
    return;
  }
  body.innerHTML='<div class="fzh none">尚未收录释义<div class="uZh"><input id="uZhIn" placeholder="补充释义（可选，回车保存）" maxlength="140"></div></div>';
  gr.hidden=false;
  var zi=document.getElementById("uZhIn");
  if(zi)zi.addEventListener("keydown",function(e){
    if(e.key!=="Enter")return;
    var v=this.value.trim();
    if(!v)return;
    var rr=recs[w]||ensureRec(w);/* 补充释义持久化 */
    rr.uZh=v.slice(0,140);
    if(!rr.zh||rr.zh.indexOf("（自定义")===0)rr.zh=rr.uZh;
    scheduleSync();renderRound();toast("释义已保存");
  });
}
/* 四选一干扰项：优先取同库词义，不足时从种子词库随机补充 */
function pickOpts(w,r){
  var out=[],seen={},pool=[],k,i;
  seen[norm(r.pos+"\u0001"+zhOf(r))]=1;
  out.push({pos:r.pos||"",zh:zhOf(r),ok:true});
  for(k in recs){if(k!==w&&zhOf(recs[k]))pool.push({pos:recs[k].pos,zh:zhOf(recs[k])});}
  if(window.WORD_SEED_MAP&&pool.length<24){
    var keys=Object.keys(WORD_SEED_MAP);
    for(i=0;i<60&&pool.length<24;i++){
      var sd=WORD_SEED_MAP[keys[Math.floor(Math.random()*keys.length)]];
      if(sd&&sd.zh)pool.push({pos:sd.pos,zh:sd.zh});
    }
  }
  shuffle(pool);
  for(i=0;i<pool.length&&out.length<4;i++){
    var key=norm(pool[i].pos+"\u0001"+pool[i].zh);
    if(seen[key])continue;
    seen[key]=1;
    out.push({pos:pool[i].pos||"",zh:pool[i].zh,ok:false});
  }
  return out;
}
function logRound(ok){/* 记录当前轮 {r:轮次, ok:是否答对, ms:反应毫秒} → sesWordLogs 按词累积 */
  var it=sesQ[sesIdx]||{},w=it.w;
  if(!w)return;
  if(!sesWordLogs[w])sesWordLogs[w]=[];
  sesWordLogs[w].push({r:it.r||1,ok:ok?1:0,ms:Math.max(0,Date.now()-sesRoundT0)});
}
function finishWord(){/* 词完成（轮3 详解「下一词」时结算）：全对 g=2 · 部分对 g=1 · 全错 g=0 */
  var card=document.querySelector("#studyBox .fcard");
  var w=card?card.getAttribute("data-w"):null;
  if(!w)return;
  var log=sesWordLogs[w]||[],item=sesQ[sesIdx],isNew=!!(item&&item.kind==="new");
  var okn=0,i;
  for(i=0;i<log.length;i++)okn+=log[i].ok;
  var g=(log.length&&okn===log.length)?2:(okn>0?1:0);
  ensureRec(w);/* 记错了重排重见可能跳过首次建目 → 结算前兜底 */
  grade(w,g);
  var rr=recs[w];
  if(rr)rr.rounds=log.slice();/* 各轮反应时与对错随词条上云 */
  if(item.rk){/* 全错重排的复评任务：不重复计入今日新词/复习量 */}
  else if(isNew){
    if(!sesNewDone[w]){sesNewDone[w]=1;sesStat.n++;bumpLog("n");}
  }else{
    sesStat.r++;bumpLog("r");
  }
  if(item&&item.idx!=null)advanceCursor(item.idx);/* 重排重见也携带 idx → 游标照常推进 */
  if(g===0){/* 全错：整词稍后再见（会话内最多 2 次，各轮记录已重置；保留原 kind） */
    sesRequeue[w]=(sesRequeue[w]||0)+1;
    if(sesRequeue[w]<=2){pushWordTasks(w,item?item.kind:"rev",item&&item.idx!=null?item.idx:undefined,1);sesTotal=sesQ.length;}
  }
  delete sesWordLogs[w];
  scheduleSync();
}
function goNextTask(d){/* 当前任务完成 → 推进到队列中的下一个任务（可能是任何词的任何轮） */
  var step=function(){sesIdx++;sesReveal=false;renderSession();};
  if(SES_FAST)step();else setTimeout(step,d);
}
function goReveal(d){/* 作答 → 展开详解 */
  var step=function(){sesReveal=true;renderRound();};
  if(SES_FAST)step();else setTimeout(step,d);
}
function endWordStep(){/* 轮3 详解「下一词」：结算该词并推进 */
  finishWord();
  goNextTask(0);
}
function bindStudy(){
  var box=document.getElementById("studyBox");
  box.addEventListener("mouseover",function(ev){var w2=ev.target.closest?ev.target.closest(".fexw"):null;if(w2)fexpopShow(w2);});
  box.addEventListener("mouseout",function(ev){var w2=ev.target.closest?ev.target.closest(".fexw"):null;if(w2)fexpopHide();});
  box.addEventListener("click",function(e){
    var card=box.querySelector(".fcard");
    if(!card)return;
    var fw=e.target.closest(".fexw");
    if(fw){fexpopShow(fw);speak(fw.getAttribute("data-w"));return;}/* 例句词：点词发声 + 释义气泡（悬浮同样出气泡），须先于整句分支 */
    var senBtn=e.target.closest("[data-spksen]");
    if(senBtn){speakSen(senBtn.getAttribute("data-spksen"));return;}/* 例句/提示句整句朗读（喇叭或词间空隙，勿落进单词 .spk 分支） */
    if(e.target.closest(".spk")){
      var spkBtn=e.target.closest("[data-spk]");
      speak(spkBtn?spkBtn.getAttribute("data-spk"):card.getAttribute("data-w"));
      if(card.getAttribute("data-mode")==="legacy"&&!card.querySelector(".fzh")){sesReveal=true;renderRound();}
      return;
    }
    if(e.target.closest("#uZhIn"))return;
    var opt=e.target.closest(".fopt");
    if(opt&&!opt.disabled&&card&&!card.querySelector(".fzh")){/* 轮1 四选一：标记对错 → 记录 → 展开详解 */
      var good=opt.getAttribute("data-ok")==="1";
      opt.classList.add(good?"ok":"ng");
      var all=box.querySelectorAll(".fopt");
      for(var i=0;i<all.length;i++){
        all[i].disabled=true;
        if(all[i].getAttribute("data-ok")==="1")all[i].classList.add("ok");
      }
      logRound(good);
      goReveal(good?300:520);
      return;
    }
    if(e.target.closest("#fskip")){/* 看答案：轮1 判错 → 展开详解 */
      logRound(false);
      goReveal(0);
      return;
    }
    if(e.target.closest("#fops2")){/* 轮2/轮3 认识与否：记录 → 展开详解 */
      var kb=e.target.closest("[data-k]");
      if(!kb||kb.disabled)return;
      var ok=kb.getAttribute("data-k")==="1";
      var kbs=box.querySelectorAll("#fops2 .fbtn");
      for(var j=0;j<kbs.length;j++)kbs[j].disabled=true;
      kb.classList.add("picked");
      logRound(ok);
      goReveal(ok?300:520);
      return;
    }
    if(e.target.closest("#fnext")){/* 详解页：下一词 / 记错了 */
      if(e.target.closest("[data-next]")){
        if((sesQ[sesIdx]||{}).r===3)endWordStep();else goNextTask(0);
      }else if(e.target.closest("[data-again]")){
        var wA=card.getAttribute("data-w");
        sesRequeue[wA]=(sesRequeue[wA]||0)+1;
        if(sesRequeue[wA]<=2){/* 记错了：清空该词各轮记录，移除未完成任务并整词重排到队尾 */
          sesWordLogs[wA]=[];
          for(var qi=sesIdx+1;qi<sesQ.length;){
            if(sesQ[qi].w===wA)sesQ.splice(qi,1);else qi++;
          }
          pushWordTasks(wA,card.getAttribute("data-kind")||"rev",card.getAttribute("data-idx")!=null?+card.getAttribute("data-idx"):undefined);
          sesTotal=sesQ.length;
        }
        goNextTask(0);
      }
      return;
    }
    if(card.getAttribute("data-mode")==="legacy"&&!card.querySelector(".fzh")){sesReveal=true;renderRound();return;}
    var g=e.target.closest("[data-g]");
    if(!g)return;
    /* 兜底翻页流（未收录词）：三键自评 */
    var w2=card.getAttribute("data-w"),kind=card.getAttribute("data-kind"),v=+g.getAttribute("data-g");
    if(kind==="new")ensureRec(w2);
    grade(w2,v);
    var r0=recs[w2];
    if(r0)r0.rounds=[{r:1,ok:v>0?1:0,ms:Math.max(0,Date.now()-sesRoundT0)}];
    if(kind==="new"){
      if(!sesNewDone[w2]){sesNewDone[w2]=1;sesStat.n++;bumpLog("n");}
      var item=sesQ[sesIdx];
      if(item&&item.idx!=null)advanceCursor(item.idx);
    }else{
      sesStat.r++;bumpLog("r");
    }
    if(v===0){/* 没印象：本轮稍后再见（会话内最多 2 次） */
      sesRequeue[w2]=(sesRequeue[w2]||0)+1;
      if(sesRequeue[w2]<=2){sesQ.push({w:w2,kind:"rev"});sesTotal=sesQ.length;}
    }
    scheduleSync();
    sesIdx++;
    renderSession();
  });
}

/* ---------- 词库（五类预览筛选：全部/待复习/生词/未学习/已巩固） ---------- */
var libFilter="all";
function libCounts(){
  var c={all:0,due:0,new:0,todo:0,strong:0},now=Date.now();
  for(var k in recs){
    var r=recs[k];c.all++;
    if(r.stage>=6)c.strong++;
    else if(r.due<=now)c.due++;
    if(r.stage===0)c.new++;
  }
  for(var i=0;i<BOOK.length;i++)if(!recs[BOOK[i].toLowerCase()])c.todo++;
  return c;
}
function renderLib(){
  var st=document.getElementById("libStats");
  var c=libCounts();
  st.innerHTML='<span>词书已学 <b>'+bookLearned()+' / '+BOOK.length+'</b></span><span>已收录 <b>'+c.all+'</b> 词</span><span>已巩固 <b>'+c.strong+'</b></span>';
  /* 筛选页签 + 计数 */
  var tabs=document.getElementById("libTabs");
  if(tabs){
    var bs=tabs.querySelectorAll("[data-f]");
    for(var i=0;i<bs.length;i++){
      var f=bs[i].getAttribute("data-f");
      bs[i].classList.toggle("on",f===libFilter);
      var lbl=bs[i].textContent.replace(/\s*\d+$/,"");
      bs[i].textContent=lbl+" "+c[f];
    }
  }
  var q=norm(document.getElementById("search").value);
  var list=document.getElementById("libList");
  var now=Date.now(),html=[];
  if(libFilter==="todo"){/* 未学习预览：词书中尚未收录的词，按词书顺序 */
    var shown=0,rest=0;
    for(var bi=0;bi<BOOK.length;bi++){
      var bw=BOOK[bi];
      if(recs[bw.toLowerCase()])continue;
      var sd=seedBy(bw)||{};
      if(q&&norm(bw).indexOf(q)<0&&norm(sd.zh||"").indexOf(q)<0)continue;
      if(shown>=80){rest++;continue;}
      shown++;
      html.push('<div class="wrow" data-w="'+esc(bw)+'">'
        +'<div class="wmain"><div class="wword">'+esc(bw)+(sd.ipa?'<span class="ipa">'+esc(sd.ipa)+'</span>':'')+'</div>'
        +'<div class="wzh"><span class="pos">'+esc(sd.pos||"")+'</span>'+esc(sd.zh||"学习后自动带出释义")+'</div></div>'
        +'<div class="wside"><span class="wchip">未学习</span><span class="wdue">词书第 '+(bi+1)+' 词</span>'
        +'<button type="button" class="spk'+(TTS?"":" off")+'" data-spk="'+esc(bw)+'" aria-label="朗读">'+SPK_SVG+'</button></div>'
        +'</div>');
    }
    if(!html.length)html.push('<div class="empty">'+(q?"没有匹配的未学单词":bookReady?"词书全部学完了——可用「默写」加练巩固":"词书加载中…")+'</div>');
    else if(rest)html.push('<div class="empty">后面还有 '+rest+' 个未学单词，先学完当前部分再来看</div>');
    list.innerHTML=html.join("");
    return;
  }
  var arr=[];for(var k in recs)arr.push(recs[k]);
  arr.sort(function(a,b){return a.due-b.due||a.added-b.added;});
  arr.forEach(function(r){
    if(libFilter==="due"&&!(r.stage<6&&r.due<=now))return;
    if(libFilter==="new"&&r.stage!==0)return;
    if(libFilter==="strong"&&r.stage<6)return;
    if(q&&norm(r.w).indexOf(q)<0&&norm(zhOf(r)).indexOf(q)<0)return;
    var chip=r.stage>=6?'<span class="wchip strong">已巩固</span>':
      (r.due<=now?'<span class="wchip due">待复习</span>':'<span class="wchip">第'+(r.stage+1)+'轮</span>');
    html.push('<div class="wrow" data-w="'+esc(r.w)+'">'
      +'<div class="wmain"><div class="wword">'+esc(r.w)+(r.ipa?'<span class="ipa">'+esc(r.ipa)+'</span>':'')+'</div>'
      +'<div class="wzh" data-edit="'+esc(r.w)+'" title="点击补充/修改释义"><span class="pos">'+esc(r.pos)+'</span>'+esc(zhOf(r))+'</div></div>'
      +'<div class="wside">'+chip+'<span class="wdue">'+md(r.due)+'</span>'
      +'<button type="button" class="spk'+(TTS?"":" off")+'" data-spk="'+esc(r.w)+'" aria-label="朗读">'+SPK_SVG+'</button>'
      +'<button type="button" class="wdel" data-del="'+esc(r.w)+'" aria-label="删除">'+DEL_SVG+'</button></div>'
      +'</div>');
  });
  list.innerHTML=html.length?html.join(""):'<div class="empty">'+(q?"没有匹配的单词":libFilter==="due"?"没有待复习的单词":libFilter==="new"?"没有生词——生词是刚学、还没通过第一轮复习的词":libFilter==="strong"?"还没有已巩固的单词（连续通过 6 轮复习）":"词库是空的——去「今日」开始学习")+'</div>';
}
function bindSpeakDel(root){
  root.addEventListener("click",function(e){
    var spk=e.target.closest("[data-spk]");
    if(spk){speak(spk.getAttribute("data-spk"));return;}
    var ed=e.target.closest("[data-edit]");
    if(ed){
      var we=ed.getAttribute("data-edit"),r=recs[we];
      if(!r)return;
      var v=window.prompt("修改「"+we+"」的释义（留空取消）：",zhOf(r));
      if(v==null)return;
      v=v.trim().slice(0,140);
      if(!v)return;
      r.uZh=v;if(!r.zh||r.zh.indexOf("（自定义")===0)r.zh=v;
      scheduleSync();renderLib();toast("释义已保存");
      return;
    }
    var del=e.target.closest("[data-del]");
    if(del){
      var w=del.getAttribute("data-del");
      if(window.confirm&&window.confirm("确定删除「"+w+"」吗？")){delWord(w);renderLib();renderHome();}
    }
  });
}

/* ---------- 默写测试 ---------- */
function startQuiz(){
  var pool=[];for(var k in recs)pool.push(recs[k]);
  if(!pool.length){renderQuizIntro();return;}
  quizQ=shuffle(pool.slice()).slice(0,QUIZ_N);
  quizIdx=0;quizOk=0;quizNg=[];quizActive=true;
  renderQuizItem();
}
function blank(word,ex){
  if(!ex)return "";
  var re=new RegExp("\\b"+word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\w*\\b","i");
  return ex.replace(re,'<span class="blank">____</span>');
}
function renderQuizIntro(){
  document.getElementById("quizBox").innerHTML='<div class="qmeta"><button type="button" class="sback" id="quizExit" aria-label="退出默写">'+BACK_SVG+'</button><span class="qprog">随机默写 · 最多 '+QUIZ_N+' 题</span></div>'
    +'<div class="empty">'+(total()?
    "默写将从你已学的 <b>"+total()+"</b> 个单词里随机抽取 "+Math.min(QUIZ_N,total)+" 个"
    :"先去「今日」学一些单词，再来默写。")
    +(total()?'<div class="center-actions"><button type="button" class="pbtn" id="quizGo">开始默写</button></div>':"")+'</div>';
  var qx=document.getElementById("quizExit");
  if(qx)qx.addEventListener("click",function(){switchTab("home");});
  var go=document.getElementById("quizGo");
  if(go)go.addEventListener("click",startQuiz);
}
function renderQuizItem(){
  var box=document.getElementById("quizBox");
  if(quizIdx>=quizQ.length){
    quizActive=false;
    var wrongHtml=quizNg.length?('<div class="wronglist"><h4>写错的词（已排入近期复习）</h4>'+quizNg.map(function(r){
      return '<div class="wrow" data-w="'+esc(r.w)+'"><div class="wmain"><div class="wword">'+esc(r.w)+'</div><div class="wzh"><span class="pos">'+esc(r.pos)+'</span>'+esc(zhOf(r))+'</div></div><div class="wside"><button type="button" class="spk'+(TTS?"":" off")+'" data-spk="'+esc(r.w)+'">'+SPK_SVG+'</button></div></div>';
    }).join("")+'</div>'):"";
    box.innerHTML='<div class="qdone"><div class="big">'+quizOk+" / "+quizQ.length+'</div><div class="sub">正确率 '+Math.round(quizOk/quizQ.length*100)+'% · 结果已计入复习计划</div>'
      +wrongHtml
      +'<div class="center-actions"><button type="button" class="pbtn" id="quizAgain">再来一组</button><button type="button" class="gbtn" id="quizToHome">返回今日</button></div></div>';
    document.getElementById("quizAgain").addEventListener("click",startQuiz);
    document.getElementById("quizToHome").addEventListener("click",function(){switchTab("home");});
    return;
  }
  var r=quizQ[quizIdx];
  box.innerHTML='<div class="qmeta"><button type="button" class="sback" id="quizExit" aria-label="退出默写">'+BACK_SVG+'</button><span class="qprog">'+(quizIdx+1)+" / "+quizQ.length+' · 已对 '+quizOk+'</span></div>'
    +'<div class="qcard" data-w="'+esc(r.w)+'">'
    +'<div class="qzh"><span class="pos">'+esc(r.pos)+'</span>'+esc(zhOf(r))+'</div>'
    +(r.ex?'<div class="qex">'+blank(r.w,r.ex)+(r.exZh?'<div class="fexzh">'+esc(r.exZh)+'</div>':"")+'</div>':"")
    +'<div class="qin"><input id="qInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="写出英文单词"><button type="button" class="pbtn" id="qSubmit">提交</button></div>'
    +'<div class="qfb" id="qFb"></div><div class="qnext" id="qNext"></div>'
    +'</div>';
  var qx=document.getElementById("quizExit");
  if(qx)qx.addEventListener("click",function(){quizActive=false;switchTab("home");});
  var inp=document.getElementById("qInput");
  inp.focus();
  inp.addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("qSubmit").click();});
  document.getElementById("qSubmit").addEventListener("click",submitQuiz);
}
function submitQuiz(){
  var r=quizQ[quizIdx],inp=document.getElementById("qInput");
  if(!inp||inp.disabled)return;
  var ok=norm(inp.value)===norm(r.w);
  inp.disabled=true;
  var fb=document.getElementById("qFb");
  if(ok){
    quizOk++;inp.classList.add("ok");
    fb.className="qfb ok";fb.textContent="正确";
    grade(r.w,2);
  }else{
    inp.classList.add("ng");
    fb.className="qfb ng";fb.textContent="再想想，正确答案：";
    var ans=document.createElement("div");ans.className="qans";ans.textContent=r.w;
    fb.after(ans);
    quizNg.push(r);
    grade(r.w,0);
  }
  bumpLog("r");
  speak(r.w);
  var b=document.createElement("button");
  b.type="button";b.className="pbtn";b.id="qGo";b.textContent=(quizIdx+1===quizQ.length)?"看结果":"下一题";
  document.getElementById("qNext").appendChild(b);
  b.addEventListener("click",function(){quizIdx++;renderQuizItem();});
}

/* ---------- 统计 ---------- */
function renderStats(){
  var box=document.getElementById("statsBox");
  var t=total();
  if(!t){box.innerHTML='<div class="empty">开始学习后，这里会展示记忆巩固情况与学习统计</div>';return;}
  /* 复习计划分桶 */
  var now=Date.now(),b={today:0,d3:0,d7:0,d30:0,strong:0};
  for(var k in recs){
    var r=recs[k];
    if(r.stage>=6){b.strong++;continue;}
    if(r.due<=now)b.today++;
    else if(r.due<=now+3*DAY)b.d3++;
    else if(r.due<=now+7*DAY)b.d7++;
    else b.d30++;
  }
  var mx=Math.max(b.today,b.d3,b.d7,b.d30,b.strong,1);
  function brow(name,n,strong){
    return '<div class="brow"><span class="bl">'+name+'</span><div class="bb'+(strong?" strong":"")+'"><i data-w="'+(n/mx)+'"></i></div><span class="bn">'+n+' 词</span></div>';
  }
  /* 保持率曲线 */
  var pts=[],i,day;
  for(day=0;day<=14;day++){
    var sum=0,cnt=0;
    for(k in recs){
      var r2=recs[k];
      var base=r2.last||r2.added||now;
      var age=(now-base)/DAY+day;
      var s=STR[Math.min(r2.stage,STR.length-1)];
      sum+=Math.exp(-Math.max(age,0)/s);cnt++;
    }
    pts.push(cnt?sum/cnt:0);
  }
  var W=560,H=180,PX=34,PY=18;
  function xy(ii){return PX+(W-PX-10)*ii/14;}
  function yy(v){return H-PY-(H-2*PY)*v;}
  var path="",dots="";
  pts.forEach(function(v,ii){
    path+=(ii?"L":"M")+xy(ii).toFixed(1)+","+yy(v).toFixed(1);
    if(ii%2===0||ii===14)dots+='<circle class="cdot" cx="'+xy(ii).toFixed(1)+'" cy="'+yy(v).toFixed(1)+'" r="2.6" fill="#b0342c"/>';
  });
  var area=path+"L"+xy(14).toFixed(1)+","+yy(0)+"L"+xy(0)+","+yy(0)+"Z";
  var grid=[1,.5,0].map(function(v){
    return '<line class="gline" x1="'+PX+'" y1="'+yy(v)+'" x2="'+(W-10)+'" y2="'+yy(v)+'" stroke-width="1" stroke-dasharray="'+(v===.5?"3 3":"0")+'"/>'
      +'<text class="gtxt" x="'+(PX-6)+'" y="'+(yy(v)+3.5)+'" text-anchor="end" font-size="9">'+Math.round(v*100)+"%</text>";
  }).join("");
  var xlab="";
  for(i=0;i<=14;i+=2)xlab+='<text class="gtxt" x="'+xy(i)+'" y="'+(H-4)+'" text-anchor="middle" font-size="9">'+(i===0?"今天":"+"+i+"天")+"</text>";
  var r14=Math.round(pts[14]*100);
  box.innerHTML=
    '<div class="panel"><h3>RETENTION / 预计记忆保持率（未来 14 天）</h3>'
    +'<div class="chart-wrap"><svg viewBox="0 0 '+W+" "+H+'" role="img" aria-label="记忆保持率曲线">'
    +'<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent,#d97a8c)" stop-opacity=".14"/><stop offset="1" style="stop-color:var(--accent,#d97a8c)" stop-opacity="0"/></linearGradient></defs>'
    +grid+'<path d="'+area+'" fill="url(#ag)"/><path class="cline" d="'+path+'" fill="none" stroke="#b0342c" stroke-width="2" stroke-linejoin="round"/>'+dots+xlab+'</svg></div>'
    +'<div class="chart-note">若不再复习，14 天后整体保持率约 <b>'+r14+'%</b>——坚持按期复习可拉回 100%。</div></div>'
    +'<div class="panel"><h3>SCHEDULE / 复习计划分布</h3><div class="buckets">'
    +brow("今日到期",b.today)+brow("3 日内",b.d3)+brow("7 日内",b.d7)+brow("30 日内",b.d30)+brow("已巩固",b.strong,true)
    +'</div><div class="chart-note">到期单词会出现在「今日」任务卡与左栏徽标上。</div></div>';
  var bars=box.querySelectorAll(".bb i");
  for(i=0;i<bars.length;i++)(function(el){
    requestAnimationFrame(function(){el.style.transform="scaleX("+el.getAttribute("data-w")+")";});
  })(bars[i]);
}

/* ---------- 备份导出 / 导入 ---------- */
function exportBackup(){
  var data={app:"danzhao-vocab",v:2,exported:new Date().toISOString(),r:recs,meta:meta};
  var blob=new Blob([JSON.stringify(data,null,1)],{type:"application/json"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="单词备份-"+todayStr()+".json";
  a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);},3000);
  toast("备份已导出");
}
function importBackup(e){
  var f=e.target.files&&e.target.files[0];
  e.target.value="";
  if(!f)return;
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var d=JSON.parse(rd.result);
      if(!d||!d.r||typeof d.r!=="object")throw 0;
      recs=d.r;
      if(d.meta){
        if(d.meta.settings&&+d.meta.settings.dailyNew)meta.settings.dailyNew=Math.min(Math.max(+d.meta.settings.dailyNew,5),60);
        if(Number.isFinite(+d.meta.cursor))meta.cursor=Math.max(+d.meta.cursor,0);
        if(d.meta.dailyLog)meta.dailyLog=d.meta.dailyLog;
      }
      scheduleSync();renderAll();
      toast("备份已导入 · "+total()+" 词");
    }catch(err){toast("备份文件无效");}
  };
  rd.readAsText(f);
}

/* ---------- 事件绑定 ---------- */
bindSpeakDel(document.getElementById("libList"));
bindStudy();
document.getElementById("search").addEventListener("input",renderLib);
/* 词库四类预览筛选 */
document.getElementById("libTabs").addEventListener("click",function(e){
  var b=e.target.closest("[data-f]");
  if(!b)return;
  libFilter=b.getAttribute("data-f");
  renderLib();
});

/* ---------- 认证与云同步初始化 ---------- */
function renderMe(){
  var chip=document.getElementById("meChip");
  if(!chip)return;
  if(ME){
    chip.hidden=false;
    chip.innerHTML=ME.avatar?'<span class="ava"><img src="/api/avatar/'+encodeURIComponent(ME.username)+'" alt=""></span>':'<span class="ava">'+esc((ME.displayName||"?").charAt(0))+'</span><span>'+esc(ME.displayName)+"</span>";
  }else chip.hidden=true;
}
function renderAll(){
  renderMe();
  if(!ME){renderLoginGate();return;}
  renderHome();
  if(tab==="lib")renderLib();
  if(tab==="stats")renderStats();
}
/* 未登录：整页登录引导（进度只挂账号，不提供游客模式） */
function renderLoginGate(){
  ["lib","read","stats","study","quiz"].forEach(function(t){var el=document.getElementById("tab-"+t);if(el)el.hidden=true;});
  var home=document.getElementById("tab-home");
  if(home)home.hidden=false;
  tab="home";
  var el=document.getElementById("homeBox");
  if(!el)return;
  el.innerHTML='<div class="task-card gate">'
    +'<div class="tc-title">登录后开始学习</div>'
    +'<p class="hint-line">学习进度、复习计划与打卡记录全部保存在你的账号下，手机与电脑实时同步，本机不保留任何数据。</p>'
    +'<div class="tc-ops"><a class="pbtn" href="/login.html">登录 / 注册</a></div>'
    +(bookReady?'<p class="hint-line">词书已就绪：'+BOOK.length+' 词 · 每日新词量可在登录后调整</p>':"")
    +'</div>';
}

switchTab("home");
loadBook();
if(typeof fetch==="function")setInterval(loadVmates,60000);
if(typeof fetch==="function"){
  api("/api/me").then(function(r){
    if(r.status===200&&r.data.user){
      adoptUser(r.data.user);
      return api("/api/vocab").then(function(v){
        if(v.status===200)mergeServer(v.data.r||[],v.data.meta||{});
        else renderAll();
      });
    }else{
      renderAll(); /* 未登录 → 登录引导 */
    }
  }).catch(function(){renderAll();});
}
/* 登录态落定：无条件刷新（进度只挂账号） */
function adoptUser(u){
  ME=u;
  renderAll();
}

/* 云端数据注入（测试钩子共用） */
function applyServerData(list,srvMeta){mergeServer(list,srvMeta);}

/* 测试钩子 */
window.__vocab={
  recs:function(){return recs;},meta:function(){return meta;},book:function(){return BOOK;},
  delWord:delWord,grade:grade,
  startSession:startSession,renderSession:renderSession,startQuiz:startQuiz,submitQuiz:submitQuiz,
  dueCount:dueCount,total:total,strongCount:strongCount,streak:streak,bookLearned:bookLearned,
  nextNewWords:nextNewWords,switchTab:switchTab,renderStats:renderStats,renderAll:renderAll,
  adoptUser:adoptUser,applyServerData:applyServerData,_setBook:function(a){BOOK=a;bookReady=true;},
  _revQ:function(){return sesQ;},_quizQ:function(){return quizQ;},_sesStat:function(){return sesStat;},
  _forceRenderSession:function(){renderSession();},_sesIdx:function(){return sesIdx;},
  _sesRound:function(){return (sesQ[sesIdx]||{}).r||1;},_sesWordLogs:function(){return sesWordLogs;},_gotoTask:function(w,r){for(var i=0;i<sesQ.length;i++){var t=sesQ[i];if(t.w===w&&(t.r||1)===(r||1)){sesIdx=i;sesReveal=false;renderSession();return true;}}return false;},_fastMode:function(){SES_FAST=true;},_findArticleEx:findArticleEx,_findArticleExBoth:findArticleExBoth,_posZhRows:posZhRows
};
