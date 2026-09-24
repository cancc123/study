"use strict";
/* ================= 阅读模块（交互式朗读阅读） =================
   文章：window.READING_ARTICLES（reading/articles.js，可自行追加）
   词典：WORD_SEED（words-data.js 全量种子词库）→ 悬浮释义 / 点击朗读
   TTS ：全文逐句朗读 · 播放/暂停/停止 · 进度条 · 句/词高亮跟随
============================================================== */
(function(){
  var TTS=("speechSynthesis" in window)&&typeof SpeechSynthesisUtterance==="function";
  var synth=TTS?window.speechSynthesis:null;
  var VOICE=null;
  function pickVoice(){
    if(!TTS)return null;
    var vs=[];
    try{vs=synth.getVoices()||[];}catch(e){}
    for(var i=0;i<vs.length;i++)if(/en[-_]US/i.test(vs[i].lang||"")&&vs[i].localService)return vs[i];
    for(i=0;i<vs.length;i++)if(/^en/i.test(vs[i].lang||""))return vs[i];
    return null;
  }
  if(TTS){
    VOICE=pickVoice();
    if(synth.addEventListener)synth.addEventListener("voiceschanged",function(){VOICE=pickVoice();});
    else synth.onvoiceschanged=function(){VOICE=pickVoice();};
  }

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

  /* ---------- 词典查询（全量种子 + 简单词形还原） ---------- */
  var MAP=null;
  function dictMap(){
    if(!MAP){MAP={};for(var i=0;i<WORD_SEED.length;i++)if(!MAP[WORD_SEED[i].w])MAP[WORD_SEED[i].w]=WORD_SEED[i];
      var ext=window.WORD_SEED_MAP||{};for(var k in ext)if(!MAP[k])MAP[k]=ext[k];/* 运行时补充词条（悬浮词级查询与种子同源） */
    }
    return MAP;
  }
  function lookup(raw){
    var w=String(raw||"").toLowerCase().replace(/[\u2019]/g,"'").replace(/[^a-z'-]/g,"");
    if(!w)return null;
    var M=dictMap();
    if(M[w])return{base:w,rec:M[w]};
    /* 连字符合成词（hundred-metre 等）：各部分都收录时拼合释义 */
    if(w.indexOf("-")>0){
      var ps=w.split("-"),ok=true,i;
      for(i=0;i<ps.length;i++)if(!M[ps[i]]){ok=false;break;}
      if(ok&&ps.length>1)return{base:w,rec:{w:w,ipa:M[ps[0]].ipa||"",pos:M[ps[0]].pos||"",zh:ps.map(function(p){return M[p].zh;}).join("；")}};
    }
    var cands=[],extra=[],i,m;
    if(/'s$/.test(w))cands.push(w.slice(0,-2));
    if(/ies$/.test(w)&&w.length>4)cands.push(w.slice(0,-3)+"y");
    if(/(ch|sh|s|x|z)es$/.test(w)&&w.length>4)cands.push(w.slice(0,-2));
    if(/s$/.test(w)&&w.length>3)cands.push(w.slice(0,-1));
    if(/ing$/.test(w)&&w.length>5){cands.push(w.slice(0,-3));cands.push(w.slice(0,-3)+"e");}
    if(/ed$/.test(w)&&w.length>4){cands.push(w.slice(0,-2));cands.push(w.slice(0,-2)+"e");cands.push(w.slice(0,-1));}
    for(i=0;i<cands.length;i++){m=/([bdfgmnprt])\1$/.exec(cands[i]);if(m)extra.push(cands[i].slice(0,-1));}
    cands=cands.concat(extra);
    for(i=0;i<cands.length;i++)if(M[cands[i]])return{base:cands[i],rec:M[cands[i]]};
    return null;
  }

  /* ---------- 状态 ---------- */
  var ARTS=(window.READING_ARTICLES||[]).filter(function(a){return a&&a.id&&a.text;});
  var cur=null,idx=0,playing=false,paused=false,rate=1,builtAid=null,gen=0,dragging=false;
  var box=null,docEl=null,tipEl=null,playBtn=null,fillEl=null,ptEl=null,barEl=null;
  var sents=[],tipTimer=null,curSentEl=null,curWordEl=null;
  var CHEV_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  var PLAY_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>';
  var PAUSE_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
  var STOP_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  function findArt(id){
    for(var i=0;i<ARTS.length;i++)if(ARTS[i].id===id)return ARTS[i];
    return null;
  }

  /* ---------- 正文构建：段落（+ 逐段中译） → 句 → 词 ---------- */
  function build(a){
    sents=[];
    var tr=(window.READING_TRANSLATIONS||{})[a.id]||[];
    var paras=String(a.text).split(/\n\s*\n/),out=[],pIdx=0;
    paras.forEach(function(para){
      para=para.replace(/\s*\n\s*/g," ").trim();
      if(!para)return;
      var zh=tr[pIdx]||"";
      pIdx++;
      var parts=para.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)||[],pHtml="";
      parts.forEach(function(raw){
        var sn=raw.trim();
        if(!sn)return;
        var si=sents.length;
        sents.push({text:sn});
        var inner="",re=/[A-Za-z][A-Za-z'\u2019-]*/g,m,li=0;
        while((m=re.exec(sn))){
          inner+=esc(sn.slice(li,m.index));
          inner+='<span class="rw" data-w="'+esc(m[0])+'" data-ci="'+m.index+'">'+esc(m[0])+"</span>";
          li=m.index+m[0].length;
        }
        inner+=esc(sn.slice(li));
        pHtml+='<span class="rsen" data-si="'+si+'">'+inner+"</span> ";
      });
      if(!pHtml)return;
      var block='<div class="rblock"><p class="rp">'+pHtml+"</p>";
      if(zh)block+='<div class="rzh-row"><button type="button" class="rptr" aria-expanded="false">中译</button></div>'
          +'<div class="rzh-wrap"><div class="rzh">'+esc(zh)+"</div></div>";
      out.push(block+"</div>");
    });
    return out.join("");
  }

  /* ---------- 渲染 ---------- */
  function render(){
    if(!ARTS.length){
      box.innerHTML='<div class="empty">暂无文章——把文章追加到 function/english/reading/articles.js 即可出现在这里</div>';
      builtAid=null;
      return;
    }
    if(!cur||!findArt(cur))cur=ARTS[0].id;
    var a=findArt(cur);
    stop(false);
    var pills=ARTS.map(function(x){
      /* 标题解析：「N · English 中文」→ 编号章 + 英文主行 + 中文副行 */
      var t=String(x.title||""),m=/^(\d+)\s*·\s*(.+)$/.exec(t),num="",rest=m?m[2]:t;
      if(m)num=m[1];
      var cjk=rest.search(/[\u4e00-\u9fff]/),en=rest,zh="";
      if(cjk>0){en=rest.slice(0,cjk).trim();zh=rest.slice(cjk);}
      return '<button type="button" class="rpill'+(x.id===cur?" on":"")+'" data-aid="'+esc(x.id)+'">'
        +(num?'<span class="rp-num">'+esc(num)+"</span>":"")
        +'<span class="rp-t">'
        +(en?'<span class="rp-en">'+esc(en)+"</span>":"")
        +(zh?'<span class="rp-zh">'+esc(zh)+"</span>":"")
        +"</span></button>";
    }).join("");
    box.innerHTML=
      '<div class="panel slim rlib" id="rlibPanel">'
      +'<button type="button" class="rlib-h" id="rlibToggle" aria-expanded="false" aria-controls="readList"><span class="rlib-t">LIBRARY / 文章</span><span class="rlib-cur">'+esc(a.title)+"</span>"+CHEV_SVG+"</button>"
      +'<div class="rlist-wrap"><div class="rlist" id="readList">'+pills+"</div></div></div>"
      +'<div class="panel rctl"><div class="rctl-row">'
      +'<button type="button" class="pbtn rplay" id="readPlay" aria-label="播放 / 暂停">'+PLAY_SVG+"<span>全文朗读</span></button>"
      +'<button type="button" class="gbtn rstop" id="readStop" aria-label="停止朗读">'+STOP_SVG+"<span>停止</span></button>"
      +'<label class="rrate">语速<select id="readRate" aria-label="朗读语速">'
      +[0.75,0.9,1,1.25].map(function(v){return '<option value="'+v+'"'+(v===rate?" selected":"")+">"+v+"\u00d7</option>";}).join("")
      +"</select></label>"
      +"</div>"
      +'<div class="rprog"><div class="rbar"><i id="readFill"></i></div><span class="rpt" id="readPt">0 / 0 句</span></div>'
      +(TTS?"":'<div class="rhint">当前浏览器不支持语音朗读，可正常阅读与查词</div>')
      +"</div>"
      +'<div class="rdoc" id="readDoc" lang="en">'+build(a)+"</div>"
      +'<div class="rtip" id="readTip" hidden></div>';
    docEl=box.querySelector("#readDoc");
    tipEl=box.querySelector("#readTip");
    playBtn=box.querySelector("#readPlay");
    fillEl=box.querySelector("#readFill");
    ptEl=box.querySelector("#readPt");
    barEl=box.querySelector(".rbar");
    builtAid=cur;
    bindEvents();
    updateProgress();
  }

  /* 切回页签：播放中不重建，保留进度与高亮 */
  function show(){
    if(!box)return;
    if(builtAid===cur&&(playing||paused))return;
    render();
  }

  function bindEvents(){
    box.querySelector("#rlibToggle").addEventListener("click",function(){
      var p=box.querySelector("#rlibPanel"),open=p.classList.toggle("open");
      this.setAttribute("aria-expanded",open?"true":"false");
    });
    box.querySelector("#readList").addEventListener("click",function(e){
      var b=e.target.closest("[data-aid]");
      if(!b||b.getAttribute("data-aid")===cur)return;
      cur=b.getAttribute("data-aid");
      render();
    });
    playBtn.addEventListener("click",togglePlay);
    box.querySelector("#readStop").addEventListener("click",function(){stop(true);});
    box.querySelector("#readRate").addEventListener("change",function(){rate=+this.value||1;});
    /* 进度条拖动：Pointer Capture 保证指针移出条体仍持续跟踪 */
    barEl.addEventListener("pointerdown",function(e){
      if(!sents.length)return;
      dragging=true;barEl.classList.add("dragging");
      try{barEl.setPointerCapture(e.pointerId);}catch(err){}
      barPreview(e);
    });
    barEl.addEventListener("pointermove",function(e){if(dragging&&sents.length)barPreview(e);});
    barEl.addEventListener("pointerup",function(e){
      if(!dragging)return;
      dragging=false;barEl.classList.remove("dragging");
      if(sents.length)seekTo(barFrac(e));
    });
    barEl.addEventListener("pointercancel",function(){dragging=false;barEl.classList.remove("dragging");});
    docEl.addEventListener("click",function(e){
      var pb=e.target.closest(".rptr");
      if(pb){/* 逐段中译显隐 */
        var wrap=pb.closest(".rblock").querySelector(".rzh-wrap"),open=wrap.classList.toggle("open");
        pb.setAttribute("aria-expanded",open?"true":"false");
        pb.textContent=open?"收起":"中译";
        return;
      }
      var el=e.target.closest(".rw");
      if(!el)return;
      if(playing||paused)stop(true);
      speakWord(el.getAttribute("data-w"));
      flash(el);
      showTip(el,true);
    });
    docEl.addEventListener("mouseover",function(e){
      var el=e.target.closest(".rw");
      if(el)showTip(el,false);
    });
    docEl.addEventListener("mouseout",function(e){
      if(e.target.closest(".rw"))scheduleHideTip();
    });
  }

  /* ---------- 全文朗读 ---------- */
  var resumeTimer=null;
  function setPlayBtn(){
    if(!playBtn)return;
    playBtn.innerHTML=(playing&&!paused?PAUSE_SVG:PLAY_SVG)+"<span>"+(playing&&!paused?"暂停":playing&&paused?"继续":"全文朗读")+"</span>";
  }
  function togglePlay(){
    if(!TTS||!sents.length)return;
    if(playing&&!paused){try{synth.pause();}catch(e){}paused=true;setPlayBtn();return;}
    if(playing&&paused){
      paused=false;setPlayBtn();
      var g0=gen;
      try{synth.resume();}catch(e){}
      /* 兼容 resume 失效的环境（部分手机/远程语音）：短超时内无任何朗读活动则重说当前句 */
      clearTimeout(resumeTimer);
      resumeTimer=setTimeout(function(){
        resumeTimer=null;
        if(playing&&!paused&&gen===g0)speakSent(idx);
      },600);
      return;
    }
    playing=true;paused=false;
    if(idx>=sents.length)idx=0;
    setPlayBtn();
    speakSent(idx);
  }
  function speakSent(i){
    idx=i;
    if(resumeTimer){clearTimeout(resumeTimer);resumeTimer=null;}
    var s=sents[i],g=++gen;/* 代际守卫：cancel/seek 后旧 utterance 的 onend 不再生效 */
    if(!s){stop(true);return;}
    highlight(i);
    updateProgress();
    var u;
    try{u=new SpeechSynthesisUtterance(s.text);}catch(e){stop(true);return;}
    u.lang="en-US";u.rate=rate;u.pitch=1;
    if(VOICE){try{u.voice=VOICE;}catch(e){}}
    u.onboundary=function(e){
      if(resumeTimer){clearTimeout(resumeTimer);resumeTimer=null;}/* resume 生效：有朗读活动即撤看门狗 */
      if(e.name&&e.name!=="word")return;
      markWord(i,e.charIndex);
    };
    u.onend=function(){
      if(g!==gen||!playing||paused)return;
      if(i+1<sents.length)speakSent(i+1);
      else stop(true);
    };
    u.onerror=function(){
      if(g!==gen||!playing||paused)return;
      if(i+1<sents.length)speakSent(i+1);
      else stop(true);
    };
    try{synth.speak(u);}catch(e){stop(true);}
  }
  function stop(reset){
    playing=false;paused=false;
    if(resumeTimer){clearTimeout(resumeTimer);resumeTimer=null;}
    if(TTS){try{synth.cancel();}catch(e){}}
    clearHighlights();
    if(reset)idx=0;
    setPlayBtn();
    if(sents.length)updateProgress();
  }
  function highlight(i){
    clearHighlights();
    curSentEl=docEl&&docEl.querySelector('.rsen[data-si="'+i+'"]');
    if(curSentEl){
      curSentEl.classList.add("cur");
      if(curSentEl.scrollIntoView)try{curSentEl.scrollIntoView({block:"center",behavior:"smooth"});}catch(e){try{curSentEl.scrollIntoView();}catch(e2){}}
    }
  }
  function markWord(si,ci){
    if(curWordEl){curWordEl.classList.remove("curw");curWordEl=null;}
    var se=docEl&&docEl.querySelector('.rsen[data-si="'+si+'"]');
    if(!se)return;
    var ws=se.querySelectorAll(".rw");
    for(var i=0;i<ws.length;i++){
      var st=+ws[i].getAttribute("data-ci"),len=ws[i].textContent.length;
      if(ci>=st&&ci<st+len){ws[i].classList.add("curw");curWordEl=ws[i];break;}
    }
  }
  function clearHighlights(){
    if(curSentEl){curSentEl.classList.remove("cur");curSentEl=null;}
    if(curWordEl){curWordEl.classList.remove("curw");curWordEl=null;}
  }
  function updateProgress(){
    if(!fillEl||!ptEl)return;
    var n=sents.length;
    if(!n){fillEl.style.width="0%";ptEl.textContent="0 / 0 句";return;}
    var cur=(playing||paused||idx>0)?idx+1:0;
    fillEl.style.width=(cur/n*100).toFixed(1)+"%";
    ptEl.textContent=cur+" / "+n+" 句";
  }

  /* ---------- 进度条拖动跳转 ---------- */
  function barFrac(e){
    var r=barEl.getBoundingClientRect(),w=r.width||1;
    return Math.min(1,Math.max(0,(e.clientX-r.left)/w));
  }
  function barPreview(e){
    var f=barFrac(e),n=sents.length;
    fillEl.style.width=(f*100).toFixed(1)+"%";
    ptEl.textContent=Math.min(n,Math.floor(f*n)+1)+" / "+n+" 句";
  }
  function seekTo(f){
    var n=sents.length;
    var i=Math.min(n-1,Math.max(0,Math.floor(f*n)));
    if(playing||paused){/* 朗读中拖动：从目标句继续播 */
      stop(false);playing=true;paused=false;setPlayBtn();speakSent(i);
      return;
    }
    idx=i;highlight(i);updateProgress();/* 空闲态：仅定位预览 */
  }

  /* ---------- 单词：点击朗读 + 悬浮释义 ---------- */
  function speakWord(w){
    if(!TTS)return;
    try{
      var u=new SpeechSynthesisUtterance(w);
      u.lang="en-US";u.rate=Math.min(rate,0.95);u.pitch=1;
      if(VOICE){try{u.voice=VOICE;}catch(e){}}
      try{synth.cancel();}catch(e){}
      synth.speak(u);
    }catch(e){}
  }
  function flash(el){
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
    setTimeout(function(){el.classList.remove("hit");},480);
  }
  function showTip(el,autoHide){
    if(!tipEl)return;
    clearTimeout(tipTimer);
    var w=el.getAttribute("data-w"),hit=lookup(w),r=hit&&hit.rec;
    var h='<div class="rt-h"><b>'+esc(w)+"</b>"
      +(r&&r.ipa?'<span class="rt-ipa">'+esc(r.ipa)+"</span>":"")
      +(r&&r.pos?'<i class="rt-pos">'+esc(r.pos)+"</i>":"")+"</div>";
    if(r){
      if(r.zh){
        var rows=(typeof window.posZhRows==="function")?window.posZhRows(r.pos,r.zh):null;
        if(rows){/* 竖排：名词一行、动词一行（与单词页同款配对；不齐时每组一行） */
          h+='<div class="rt-rows">'+rows.map(function(rw){
            return '<div class="rt-row">'+(rw.pos?'<i class="rt-pos">'+esc(rw.pos)+"</i>":"")+'<span class="rt-zh">'+esc(rw.zh)+"</span></div>";
          }).join("")+"</div>";
        }else h+='<div class="rt-zh">'+esc(r.zh)+"</div>";
      }
      if(r.ex)h+='<div class="rt-ex"><span class="rt-lab">例</span>'+esc(r.ex)+"</div>";
      if(r.exZh)h+='<div class="rt-exzh">'+esc(r.exZh)+"</div>";
      if(r.col)h+='<div class="rt-col"><span class="rt-lab">词形</span>'+esc(r.col)+"</div>";
    }else{
      h+='<div class="rt-miss">词库暂未收录该词，点击可听发音</div>';
    }
    tipEl.innerHTML=h;
    tipEl.hidden=false;
    tipEl.classList.add("show");
    var rect=el.getBoundingClientRect();
    var vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight;
    var tw=tipEl.offsetWidth,th=tipEl.offsetHeight;
    var x=rect.left+rect.width/2-tw/2;
    x=Math.max(8,Math.min(x,vw-tw-8));
    var y=rect.bottom+8;
    if(y+th>vh-8&&rect.top-th-8>0)y=rect.top-th-8;
    tipEl.style.left=x+"px";
    tipEl.style.top=y+"px";
    if(autoHide)tipTimer=setTimeout(hideTip,3000);
  }
  function scheduleHideTip(){
    clearTimeout(tipTimer);
    tipTimer=setTimeout(hideTip,160);
  }
  function hideTip(){
    clearTimeout(tipTimer);
    if(tipEl){tipEl.classList.remove("show");tipEl.hidden=true;}
  }

  /* ---------- 初始化与测试钩子 ---------- */
  function init(){
    box=document.getElementById("readBox");
    if(box&&!ARTS.length)ARTS=(window.READING_ARTICLES||[]).filter(function(a){return a&&a.id&&a.text;});
  }
  init();
  window.__reading={
    show:show,
    render:render,
    lookup:lookup,
    _state:function(){return {aid:cur,idx:idx,playing:playing,paused:paused,total:sents.length};},
    _speakSent:function(i){if(playing||paused)stop(false);playing=true;speakSent(i);setPlayBtn();}
  };
})();
