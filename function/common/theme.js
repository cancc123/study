"use strict";
/* ================= 全局主题（Day / Night × 多配色）共享逻辑 =================
   用法：各页面 <head> 内、<link> 样式表之前同步引入本文件：
     <script src="/function/common/theme.js"></script>
   1) 解析时立即应用已保存主题与配色（localStorage danzhao_theme_v1 /
      danzhao_accent_v1；主题未选择时跟随系统 prefers-color-scheme），
      首帧前落定，杜绝闪白/闪黑；
   2) 同步 <meta name="theme-color">（按当前配色读取 --bg 计算值，
      Android 状态栏 / WebView 随配色联动）；
   3) 自动挂载右下角悬浮按钮，点按弹出玻璃面板：
      浅色/深色切换 + 四款配色（data-accent）自由切换，
      样式自包含，不依赖任何页面 CSS；跨标签页 storage 实时同步。
   配色 token 由 common/index.css 与 english.css 的 data-accent 覆盖块提供。
   测试钩子：window.__theme = {get,set,toggle,apply,getAccent,setAccent,PALETTES}
=================================================================== */
(function(){
  var KEY="danzhao_theme_v1",AKEY="danzhao_accent_v1";
  var PALETTES=[
    {id:"rainbow",name:"漫舞彩虹",dot:"conic-gradient(from 210deg,#f8c9d4,#fdf3c9,#d1f3c8,#c3d4ea,#e3c9f2,#f8c9d4)"},
    {id:"sakura",name:"樱花",dot:"#d66f97"},
    {id:"jasmine",name:"茉莉奶绿",dot:"#6a9374"},
    {id:"mist",name:"柳绿朝烟",dot:"#4f9f9b"}
  ];
  var mq=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;

  function sGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function sSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}

  function storedTheme(){
    var v=sGet(KEY);
    return (v==="light"||v==="dark")?v:null;
  }
  function storedAccent(){
    var v=sGet(AKEY),i;
    for(i=0;i<PALETTES.length;i++)if(PALETTES[i].id===v)return v;
    return null;
  }
  function sysDark(){return !!(mq&&mq.matches);}
  function metaColor(t){
    try{
      var v=getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
      if(v)return v;
    }catch(e){}
    return t==="dark"?"#171412":"#faf9f7";
  }
  function apply(t,a){
    var el=document.documentElement;
    el.setAttribute("data-theme",t);
    el.setAttribute("data-accent",a);
    var m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute("content",metaColor(t));
  }

  /* head 内同步执行：首帧前落定主题与配色 */
  var cur=storedTheme()||(sysDark()?"dark":"light");
  var accent=storedAccent()||"rainbow";
  apply(cur,accent);

  function set(t){
    cur=t;
    sSet(KEY,t);
    apply(cur,accent);
    paintAll();
  }
  function toggle(){set(cur==="dark"?"light":"dark");}
  function setAccent(a){
    var i,ok=false;
    for(i=0;i<PALETTES.length;i++)if(PALETTES[i].id===a)ok=true;
    if(!ok)return;
    accent=a;
    sSet(AKEY,a);
    apply(cur,accent);
    paintAll();
  }

  /* 未手动选择主题时，跟随系统实时切换 */
  if(mq&&mq.addEventListener){
    mq.addEventListener("change",function(e){
      if(!storedTheme()){cur=e.matches?"dark":"light";apply(cur,accent);paintAll();}
    });
  }
  /* 跨标签页同步 */
  window.addEventListener("storage",function(e){
    if(e.key!==KEY&&e.key!==AKEY)return;
    cur=storedTheme()||(sysDark()?"dark":"light");
    accent=storedAccent()||"rainbow";
    apply(cur,accent);
    paintAll();
  });

  /* ---------- 悬浮按钮 + 玻璃切换面板（样式自包含） ---------- */
  var IC_SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19"/></svg>';
  var IC_MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.4 13.2A8.3 8.3 0 0 1 10.8 3.6a8.3 8.3 0 1 0 9.6 9.6z"/></svg>';

  var btn=null,panel=null;
  function paintFab(){
    if(!btn)return;
    var dark=cur==="dark";
    btn.innerHTML=dark?IC_SUN:IC_MOON;
    var tip=dark?"切换到浅色模式":"切换到深色模式";
    btn.title=tip;btn.setAttribute("aria-label",tip);
    btn.setAttribute("aria-pressed",dark?"true":"false");
  }
  function paintPanel(){
    if(!panel)return;
    var seg=panel.querySelectorAll(".tp-seg button"),i;
    for(i=0;i<seg.length;i++){
      var on=seg[i].getAttribute("data-t")===cur;
      seg[i].className=on?"on":"";
      seg[i].setAttribute("aria-pressed",on?"true":"false");
    }
    var dots=panel.querySelectorAll(".tp-dot");
    for(i=0;i<dots.length;i++){
      var dOn=dots[i].getAttribute("data-a")===accent;
      dots[i].className=dOn?"tp-dot on":"tp-dot";
      dots[i].setAttribute("aria-pressed",dOn?"true":"false");
    }
  }
  function paintAll(){paintFab();paintPanel();}
  function openPanel(){
    if(!panel)return;
    panel.hidden=false;
    requestAnimationFrame(function(){panel.className="theme-panel show";});
    btn.setAttribute("aria-expanded","true");
  }
  function closePanel(){
    if(!panel||panel.hidden)return;
    panel.className="theme-panel";
    panel.hidden=true;
    if(btn)btn.setAttribute("aria-expanded","false");
  }
  function togglePanel(){
    if(panel&&panel.hidden)openPanel();else closePanel();
  }

  var PANEL_CSS=
    ".theme-fab{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:70;width:40px;height:40px;border-radius:50%;border:1px solid var(--gline,rgba(255,255,255,.7));background:var(--chip,rgba(255,255,255,.55));box-shadow:inset 0 1px 0 var(--ghl,rgba(255,255,255,.55));color:var(--ink-soft,#44403c);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;-webkit-backdrop-filter:var(--blur,blur(18px) saturate(1.5));backdrop-filter:var(--blur,blur(18px) saturate(1.5));transition:border-color .15s var(--ease-out,ease),color .15s var(--ease-out,ease),transform .12s var(--ease-out,ease);}"
    +".theme-fab:hover{color:var(--accent,#d97a8c);border-color:var(--accent-line,rgba(217,122,140,.35));}"
    +".theme-fab:active{transform:scale(.92);}"
    +".theme-fab svg{width:18px;height:18px;}"
    +".theme-panel{position:fixed;right:14px;bottom:calc(62px + env(safe-area-inset-bottom,0px));z-index:70;width:178px;padding:13px 13px 11px;border-radius:16px;border:1px solid var(--gline,rgba(255,255,255,.7));background:var(--tip-bg,rgba(255,255,255,.9));box-shadow:0 18px 50px -18px rgba(28,25,23,.35),inset 0 1px 0 var(--ghl,rgba(255,255,255,.55));-webkit-backdrop-filter:var(--blur-strong,blur(28px) saturate(1.65));backdrop-filter:var(--blur-strong,blur(28px) saturate(1.65));font-family:var(--sans,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif);color:var(--ink,#1c1917);opacity:0;transform:translateY(6px);transition:opacity .16s var(--ease-out,ease),transform .16s var(--ease-out,ease);}"
    +".theme-panel.show{opacity:1;transform:none;}"
    +".tp-cap{font-size:10.5px;font-weight:800;letter-spacing:.12em;color:var(--muted,#78716c);margin:0 0 7px;}"
    +".tp-seg{display:flex;gap:4px;background:var(--ink-ghost,rgba(28,25,23,.07));border-radius:10px;padding:3px;}"
    +".tp-seg button{flex:1;border:none;border-radius:8px;background:transparent;color:var(--ink-soft,#44403c);font:700 12px/1 var(--sans,-apple-system,'PingFang SC',sans-serif);padding:7px 0;cursor:pointer;transition:background .15s var(--ease-out,ease),color .15s var(--ease-out,ease);}"
    +".tp-seg button.on{background:var(--accent,#d97a8c);color:#fff;}"
    +".tp-dots{display:flex;gap:9px;justify-content:space-between;padding:2px 1px 0;}"
    +".tp-dot{width:21px;height:21px;border-radius:50%;border:1px solid rgba(28,25,23,.14);cursor:pointer;padding:0;flex-shrink:0;transition:transform .12s var(--ease-out,ease),box-shadow .15s var(--ease-out,ease);}"
    +".tp-dot:hover{transform:scale(1.12);}"
    +".tp-dot:active{transform:scale(.94);}"
    +".tp-dot.on{box-shadow:0 0 0 2px var(--tip-bg,#fff),0 0 0 4px var(--accent,#d97a8c);}"
    +"@media (prefers-reduced-motion:reduce){.theme-fab,.theme-panel,.tp-dot,.tp-seg button{transition:none;}}";

  function mountBtn(){
    if(document.getElementById("themeFab"))return;
    var st=document.createElement("style");
    st.id="themeFabStyle";
    st.textContent=PANEL_CSS;
    document.head.appendChild(st);

    btn=document.createElement("button");
    btn.type="button";btn.className="theme-fab";btn.id="themeFab";
    btn.setAttribute("aria-haspopup","true");
    btn.setAttribute("aria-expanded","false");
    btn.setAttribute("aria-controls","themePanel");
    btn.addEventListener("click",function(e){e.stopPropagation();togglePanel();});
    document.body.appendChild(btn);

    panel=document.createElement("div");
    panel.id="themePanel";
    panel.className="theme-panel";
    panel.hidden=true;
    panel.setAttribute("role","group");
    panel.setAttribute("aria-label","主题与配色");
    var html='<p class="tp-cap">APPEARANCE / 外观</p>'
      +'<div class="tp-seg" role="group" aria-label="明暗模式">'
      +'<button type="button" data-t="light">浅色</button>'
      +'<button type="button" data-t="dark">深色</button></div>'
      +'<p class="tp-cap" style="margin-top:11px;">PALETTE / 配色</p>'
      +'<div class="tp-dots" role="group" aria-label="主题配色">';
    for(var i=0;i<PALETTES.length;i++){
      var p=PALETTES[i];
      html+='<button type="button" class="tp-dot" data-a="'+p.id+'" title="'+p.name+'" aria-label="配色：'+p.name+'" style="background:'+p.dot+'"></button>';
    }
    html+='</div>';
    panel.innerHTML=html;

    panel.addEventListener("click",function(e){
      e.stopPropagation();
      var t=e.target.closest?e.target.closest("[data-t]"):null;
      if(t){set(t.getAttribute("data-t"));return;}
      var d=e.target.closest?e.target.closest("[data-a]"):null;
      if(d){setAccent(d.getAttribute("data-a"));}
    });
    document.addEventListener("click",function(e){
      if(panel.hidden)return;
      if(e.target===btn||btn.contains(e.target))return;
      closePanel();
    });
    document.addEventListener("keydown",function(e){
      if(e.key==="Escape")closePanel();
    });
    document.body.appendChild(panel);
    paintAll();
  }
  if(document.body)mountBtn();
  else document.addEventListener("DOMContentLoaded",mountBtn);

  /* 测试钩子 */
  window.__theme={
    get:function(){return cur;},
    set:set,
    toggle:toggle,
    apply:function(t){apply(t,accent);cur=t;},
    getAccent:function(){return accent;},
    setAccent:setAccent,
    PALETTES:PALETTES
  };
})();
