"use strict";
(function () {
  var ME = null;
  var avaBox = document.getElementById("avaBox");
  var avaLetter = document.getElementById("avaLetter");
  var fileInput = document.getElementById("avaFile");
  var removeBtn = document.getElementById("avaRemove");
  var errEl = document.getElementById("setErr");
  var okEl = document.getElementById("setOk");

  function showAva(me) {
    if (me.avatar) {
      avaBox.innerHTML = '<img class="ava ava-xl" src="/api/avatar/' + encodeURIComponent(me.username) + '?v=' + Math.floor((me.updatedAt || Date.now()) / 1000) + '" alt="头像">';
    } else {
      avaLetter.textContent = me.displayName.charAt(0);
      avaBox.innerHTML = "";
      avaBox.appendChild(avaLetter);
    }
    removeBtn.hidden = !me.avatar;
  }
  function flashErr(m) { errEl.textContent = m || ""; }
  function flashOk(m) { okEl.textContent = m || ""; setTimeout(function () { if (okEl.textContent === m) okEl.textContent = ""; }, 2500); }

  /* 未登录跳转 */
  fetch("/api/me", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d.user) { location.href = "/login.html"; return; }
    ME = d.user;
    document.getElementById("setName").textContent = ME.displayName;
    showAva(ME);
  }).catch(function () { location.href = "/login.html"; });

  /* 选图 → 居中裁剪 256×256 → 压缩 JPEG → 上传 */
  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { flashErr("仅支持 JPG / PNG / WebP 图片"); return; }
    if (f.size > 15 * 1024 * 1024) { flashErr("原图过大（≤15MB）"); return; }
    flashErr(""); flashOk("");
    var img = new Image();
    var url = URL.createObjectURL(f);
    img.onload = function () {
      URL.revokeObjectURL(url);
      try {
        var S = 256, cv = document.createElement("canvas");
        cv.width = S; cv.height = S;
        var ctx = cv.getContext("2d");
        var side = Math.min(img.naturalWidth, img.naturalHeight);
        ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, S, S);
        var data = cv.toDataURL("image/jpeg", 0.85);
        fetch("/api/avatar", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: data })
        }).then(function (r) { return r.json().then(function (d2) { return { status: r.status, data: d2 }; }); })
          .then(function (r) {
            if (r.status < 300) { ME.avatar = true; ME.updatedAt = r.data.updatedAt; showAva(ME); flashOk("头像已更新"); }
            else flashErr(r.data.error || "上传失败，请重试");
          }).catch(function () { flashErr("网络异常，请重试"); });
      } catch (e) { flashErr("图片处理失败，请换一张试试"); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); flashErr("图片读取失败，请换一张试试"); };
    img.src = url;
  });

  removeBtn.addEventListener("click", function () {
    fetch("/api/avatar", { method: "DELETE", credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) { ME.avatar = false; showAva(ME); flashOk("头像已移除"); }
      }).catch(function () { flashErr("网络异常，请重试"); });
  });
})();
