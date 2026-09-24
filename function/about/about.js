"use strict";
/* ================= 关于本站 · 联系方式一键复制 ================= */
(function(){
  function bindCopy(btn){
    btn.addEventListener("click",function(){
      var v=btn.getAttribute("data-copy"),old=btn.textContent;
      function done(){
        btn.textContent="已复制";btn.classList.add("done");
        setTimeout(function(){btn.textContent=old;btn.classList.remove("done");},1200);
      }
      function legacy(){
        var i=document.createElement("input");
        i.value=v;i.style.position="fixed";i.style.opacity="0";
        document.body.appendChild(i);i.select();
        try{document.execCommand("copy");done();}catch(e){}
        i.remove();
      }
      var handed=false;
      if(navigator.clipboard&&typeof navigator.clipboard.writeText==="function"){
        try{navigator.clipboard.writeText(v).then(done,legacy);handed=true;}catch(e){}
      }
      if(!handed)legacy();/* 旧浏览器 / 无 Clipboard API：execCommand 降级 */
    });
  }
  function init(){
    var list=document.querySelectorAll("[data-copy]");
    for(var i=0;i<list.length;i++)bindCopy(list[i]);
    loadVisits();
  }
  /* ---------- 浏览量：每会话只自增一次，重复进入仅读取 ---------- */
  var PV_KEY="danzhao_about_pv_v1";
  function renderViews(n){
    var el=document.getElementById("abViewsN");
    if(el)el.textContent=typeof n==="number"?n.toLocaleString("en-US"):"–";
  }
  function loadVisits(){
    if(typeof fetch!=="function")return;
    var counted=false;
    try{counted=sessionStorage.getItem(PV_KEY)==="1";}catch(e){}
    var opts=counted
      ?{method:"GET"}
      :{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({page:"about"})};
    fetch("/api/visits"+(counted?"?page=about":""),opts).then(function(r){
      return r.ok?r.json():null;
    }).then(function(d){
      if(!d||typeof d.total!=="number")return;
      renderViews(d.total);
      if(!counted){try{sessionStorage.setItem(PV_KEY,"1");}catch(e){}}
    }).catch(function(){});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
