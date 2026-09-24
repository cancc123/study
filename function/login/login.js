"use strict";
(function () {
  var mode = "login";
  var tabL = document.getElementById("tabLogin");
  var tabR = document.getElementById("tabReg");
  var nickRow = document.getElementById("nickRow");
  var go = document.getElementById("authGo");
  var err = document.getElementById("authErr");

  function setMode(m) {
    mode = m;
    tabL.classList.toggle("on", m === "login");
    tabR.classList.toggle("on", m === "register");
    nickRow.hidden = (m !== "register");
    go.textContent = m === "login" ? "登 录" : "注 册 并 登 录";
    document.getElementById("fPass").setAttribute("autocomplete", m === "login" ? "current-password" : "new-password");
    err.textContent = "";
  }
  tabL.addEventListener("click", function () { setMode("login"); });
  tabR.addEventListener("click", function () { setMode("register"); });
  if (location.search.indexOf("mode=register") > -1) setMode("register");

  document.getElementById("authForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var username = document.getElementById("fUser").value.trim();
    var password = document.getElementById("fPass").value;
    if (!username || !password) { err.textContent = "请填写用户名和密码"; return; }
    var body = { username: username, password: password };
    if (mode === "register") {
      var n = document.getElementById("fNick").value.trim();
      if (n) body.displayName = n;
    }
    go.disabled = true;
    var old = go.textContent;
    go.textContent = "请稍候…";
    fetch("/api/" + (mode === "login" ? "login" : "register"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    }).then(function (r) {
      if (r.status < 300) {
        location.href = "/";
      } else {
        err.textContent = r.data.error || "操作失败，请重试";
        go.disabled = false;
        go.textContent = old;
      }
    }).catch(function () {
      err.textContent = "网络异常，请重试";
      go.disabled = false;
      go.textContent = old;
    });
  });
})();
