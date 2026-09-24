"use strict";
/* ================= 左侧可折叠功能区（共享组件） =================
   桌面端：折叠 56px 仅图标 ⇄ 展开 200px 图标+名称（状态存本机，默认折叠）
   手机端：FAB 呼出抽屉，点条目/遮罩关闭
   徽标：登录后每 60 秒拉取 /api/vocab/due（待复习词数）
=============================================================== */
(function(){
  var SKEY="danzhao_sb_open_v1";

  /* 图标（内联 SVG，currentColor） */
  var IC={
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8.5 12.5 2.5 2.5 5-6"/></svg>',
    book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/></svg>',
    zh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
    gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8.2h.01"/><path d="M12 11.5V16"/></svg>',
    chevL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>',
    menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>'
  };

  /* 当前页高亮 */
  var path=location.pathname.replace(/\/+$/,"");
  var active=(path.indexOf("/function/english")===0||path==="/function/english")?"en":
             (path.indexOf("/function/chinese")===0||path==="/function/chinese")?"zh":
             (path.indexOf("/function/about")===0||path==="/function/about")?"about":
             (path.indexOf("/settings")===0)?"set":
             (path===""||path==="/index.html"||path.indexOf("/%E4%BD%93%E8%82%B2")===0)?"home":"home";

  var rail=document.createElement("nav");
  rail.className="srail";rail.id="srail";rail.setAttribute("aria-label","功能区");
  rail.innerHTML=
    '<button type="button" class="s-toggle" id="sToggle" aria-expanded="false" aria-controls="sBody" title="展开 / 折叠功能区">'+IC.chevL+'</button>'
    +'<div class="s-body" id="sBody">'
    +  '<a class="s-item'+(active==="home"?" active":"")+'" href="/" title="打卡清单">'+IC.check+'<span class="s-name">打卡清单</span></a>'
    +  '<a class="s-item'+(active==="en"?" active":"")+'" href="/function/english/" title="单词背诵">'+IC.book+'<span class="s-name">单词背诵</span><b class="s-badge" id="sVocabBadge" hidden></b></a>'
    +  '<a class="s-item'+(active==="zh"?" active":"")+'" href="/function/chinese/" title="语文复习">'+IC.zh+'<span class="s-name">语文复习</span></a>'
    +  '<a class="s-item'+(active==="set"?" active":"")+'" href="/settings.html" title="个人设置">'+IC.gear+'<span class="s-name">个人设置</span></a>'
    +  '<a class="s-item'+(active==="about"?" active":"")+'" href="/function/about/" title="关于本站">'+IC.info+'<span class="s-name">关于本站</span></a>'
    +'</div>';
  var fab=document.createElement("button");
  fab.type="button";fab.className="s-fab";fab.id="sFab";fab.setAttribute("aria-label","打开功能区");fab.title="功能区";
  fab.innerHTML=IC.menu;
  var scrim=document.createElement("div");
  scrim.className="s-scrim";scrim.id="sScrim";

  function mount(){
    if(document.getElementById("srail"))return;
    document.body.insertBefore(scrim,document.body.firstChild);
    document.body.insertBefore(rail,document.body.firstChild);
    document.body.appendChild(fab);
    /* 折叠状态（默认折叠；手机端由 body.sb-open 同时控制抽屉） */
    var open=false;
    try{open=localStorage.getItem(SKEY)==="1";}catch(e){}
    setOpen(open,true);
    document.getElementById("sToggle").addEventListener("click",function(){setOpen(!document.body.classList.contains("sb-open"));});
    fab.addEventListener("click",function(){setOpen(true);});
    scrim.addEventListener("click",function(){setOpen(false);});
    rail.addEventListener("click",function(e){
      if(e.target.closest(".s-item"))setOpen(false,true); /* 跳转不记忆抽屉态 */
    });
  }

  function setOpen(v,silent){
    document.body.classList.toggle("sb-open",v);
    rail.querySelector(".s-toggle").setAttribute("aria-expanded",v?"true":"false");
    if(!silent){try{localStorage.setItem(SKEY,v?"1":"0");}catch(e){}}
  }

  /* 待复习徽标 */
  function badge(n){
    var b=document.getElementById("sVocabBadge");
    if(!b)return;
    if(n>0){b.textContent=n>99?"99+":n;b.hidden=false;}
    else b.hidden=true;
  }
  function loadBadge(){
    if(typeof fetch!=="function")return;
    fetch("/api/vocab/due",{credentials:"same-origin"}).then(function(r){
      return r.ok?r.json():null;
    }).then(function(d){badge(d&&d.due||0);}).catch(function(){});
  }

  function init(){
    if(!document.body)return;
    mount();
    loadBadge();
    if(typeof fetch==="function")setInterval(loadBadge,60000);
  }
  if(document.body)init();
  else document.addEventListener("DOMContentLoaded",function(){init();});

  /* 测试钩子 */
  window.__sidebar={setOpen:setOpen,badge:badge,isOpen:function(){return document.body.classList.contains("sb-open");}};
})();
