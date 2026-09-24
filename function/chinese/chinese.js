"use strict";
/* ================= 语文复习页 =================
   数据：chinese-data.js → window.CHINESE_BOOK
   三分区（技巧讲解/考试大纲/附录素材）× 章节chip × 正文渲染
   记住上次阅读位置（本机 localStorage）
=============================================================== */
(function(){
  var LKEY="yuwen_read_v1";
  var book=(typeof window!=="undefined"&&window.CHINESE_BOOK)||null;
  var state={part:0,ch:0};

  var elTabs=document.getElementById("ctabs");
  var elChips=document.getElementById("chips");
  var elBody=document.getElementById("cbody");
  var elToc=document.getElementById("ctoc");
  var elTocBody=document.getElementById("ctocBody");
  var elPrev=document.getElementById("cprev");
  var elNext=document.getElementById("cnext");
  var elToTop=document.getElementById("toTop");
  var elMeta=document.getElementById("chMeta");
  var elRead=document.getElementById("creadBar");

  function chapters(){return book.parts[state.part].chapters;}

  /* ---------- 章节chip行 ---------- */
  function renderChips(){
    var chs=chapters(),html="";
    for(var i=0;i<chs.length;i++){
      var n=i+1,no=(book.parts[state.part].id==="tech")?(n<10?"0"+n:String(n))+" ":"";
      html+='<button type="button" role="tab" data-i="'+i+'" class="'+(i===state.ch?"on":"")+'">'+(no?"<span class='no'>"+no+"</span>":"")+esc(chs[i].t)+"</button>";
    }
    elChips.innerHTML=html;
    var on=elChips.querySelector("button.on");
    if(on)on.scrollIntoView({inline:"center",block:"nearest"});
  }

  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

  /* ---------- 正文渲染 ---------- */
  function renderChapter(){
    var ch=chapters()[state.ch];
    var out='<h2 class="ch-title">'+esc(ch.t)+"</h2>";
    var h3s=[];
    if(!ch.blocks.length){
      out+='<div class="empty">此节原文暂无内容</div>';
    }else{
      var h3n=0;
      for(var i=0;i<ch.blocks.length;i++){
        var b=ch.blocks[i],t=b[0];
        if(t==="h3"){h3n++;out+='<h3 id="sec'+h3n+'">'+b[1]+"</h3>";h3s.push({id:"sec"+h3n,txt:b[1]});}
        else if(t==="h4")out+="<h4>"+b[1]+"</h4>";
        else if(t==="li")out+='<p class="cli">'+b[1]+"</p>";
        else if(t==="p")out+="<p>"+b[1]+"</p>";
        else if(t==="table"){
          var tb=b[1];
          out+="<table>";
          if(tb.head&&tb.head.length){out+="<tr>";for(var h=0;h<tb.head.length;h++)out+="<th>"+tb.head[h]+"</th>";out+="</tr>";}
          for(var r=0;r<tb.rows.length;r++){out+="<tr>";for(var c=0;c<tb.rows[r].length;c++)out+="<td>"+tb.rows[r][c]+"</td>";out+="</tr>";}
          out+="</table>";
        }
      }
    }
    elBody.innerHTML=out;
    /* 章内目录（h3 ≥3 才显示） */
    if(h3s.length>=3){
      var th="";
      for(var k=0;k<h3s.length;k++)th+='<a href="#'+h3s[k].id+'">'+h3s[k].txt+"</a>";
      elTocBody.innerHTML=th;
      elToc.hidden=false;
    }else{elToc.hidden=true;elToc.open=false;}
    /* 上下章按钮 */
    elPrev.disabled=state.ch<=0&&state.part===0;
    elNext.disabled=state.ch>=chapters().length-1&&state.part>=book.parts.length-1;
    elPrev.textContent=prevLabel();
    elNext.textContent=nextLabel();
    /* 头部统计 */
    elMeta.textContent=(state.ch+1)+" / "+chapters().length;
    updateRead();
    savePos();
  }

  function prevLabel(){
    if(state.ch>0)return "← "+chapters()[state.ch-1].t;
    if(state.part>0)return "← "+book.parts[state.part-1].name;
    return "上一章";
  }
  function nextLabel(){
    if(state.ch<chapters().length-1)return chapters()[state.ch+1].t+" →";
    if(state.part<book.parts.length-1)return book.parts[state.part+1].name+" →";
    return "下一章";
  }
  function goPrev(){
    if(state.ch>0)state.ch--;
    else if(state.part>0){state.part--;state.ch=chapters().length-1;}
    else return;
    renderAll();
  }
  function goNext(){
    if(state.ch<chapters().length-1)state.ch++;
    else if(state.part<book.parts.length-1){state.part++;state.ch=0;}
    else return;
    renderAll();
  }

  /* ---------- 页签切换 ---------- */
  function renderPart(){
    var btns=elTabs.querySelectorAll("button");
    for(var i=0;i<btns.length;i++)btns[i].classList.toggle("on",i===state.part);
    renderChips();
    renderChapter();
  }
  function renderAll(){renderPart();window.scrollTo({top:0});}

  /* ---------- 阅读进度 + 返回顶部 ---------- */
  function updateRead(){
    var doc=document.documentElement;
    var max=doc.scrollHeight-window.innerHeight;
    var p=max>40?Math.min(1,Math.max(0,window.scrollY/max)):0;
    elRead.style.transform="scaleX("+p+")";
  }
  function onScroll(){
    updateRead();
    if(window.scrollY>600)elToTop.classList.add("show");
    else elToTop.classList.remove("show");
  }

  /* ---------- 位置记忆 ---------- */
  function savePos(){try{localStorage.setItem(LKEY,JSON.stringify(state));}catch(e){}}
  function loadPos(){
    try{
      var s=JSON.parse(localStorage.getItem(LKEY)||"null");
      if(s&&s.part>=0&&s.part<book.parts.length){
        state.part=s.part;
        if(s.ch>=0&&s.ch<chapters().length)state.ch=s.ch;
      }
    }catch(e){}
  }

  /* ---------- 事件 ---------- */
  elTabs.addEventListener("click",function(e){
    var b=e.target.closest("button[data-part]");if(!b)return;
    var idx=Array.prototype.indexOf.call(elTabs.querySelectorAll("button"),b);
    if(idx===state.part)return;
    state.part=idx;state.ch=0;renderAll();
  });
  elChips.addEventListener("click",function(e){
    var b=e.target.closest("button[data-i]");if(!b)return;
    var i=+b.getAttribute("data-i");
    if(i===state.ch)return;
    state.ch=i;
    renderChips();renderChapter();window.scrollTo({top:0});
  });
  elTocBody.addEventListener("click",function(e){
    var a=e.target.closest("a");if(!a)return;
    e.preventDefault();
    var t=document.getElementById(a.getAttribute("href").slice(1));
    if(t)t.scrollIntoView({block:"start"});
    elToc.open=false;
  });
  elPrev.addEventListener("click",goPrev);
  elNext.addEventListener("click",goNext);
  elToTop.addEventListener("click",function(){window.scrollTo({top:0});});
  window.addEventListener("scroll",onScroll,{passive:true});

  /* ---------- 启动 ---------- */
  function init(){
    if(!book){elBody.innerHTML='<div class="empty">资料数据加载失败</div>';return;}
    loadPos();
    renderPart();
  }
  init();

  /* 测试钩子 */
  window.__chinese={
    state:state,
    renderPart:renderPart,
    renderChapter:renderChapter,
    goPrev:goPrev,
    goNext:goNext,
    book:book
  };
})();
