"use strict";
/* API 文档页：代码块一键复制 */
(function(){
  document.querySelectorAll("pre.code[data-code]").forEach(function(pre){
    var btn=document.createElement("button");
    btn.type="button";btn.className="ccopy";btn.textContent="复制";
    btn.addEventListener("click",function(){
      var text=pre.getAttribute("data-code")||pre.textContent;
      function ok(){btn.textContent="已复制";btn.classList.add("done");setTimeout(function(){btn.textContent="复制";btn.classList.remove("done");},1400);}
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(ok).catch(function(){fallback();});
      }else fallback();
      function fallback(){
        var ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";
        document.body.appendChild(ta);ta.select();
        try{document.execCommand("copy");ok();}catch(e){}
        document.body.removeChild(ta);
      }
    });
    pre.appendChild(btn);
  });
})();
