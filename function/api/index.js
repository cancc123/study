"use strict";
/* ============================================================
   StudyPad API 模块（function/api/index.js）
   全部 /api/* 接口 + 公开进度查询（/用户名=密码）+ API 文档页路由。
   由站点根 server.js 安装：require("./function/api")(app, ctx)
   —— 本文件是 Node 服务端模块，公网静态访问已被屏蔽（见下）。
   ============================================================ */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");

module.exports = function installApi(app, ctx) {
  const { ROOT, DATA_DIR, AVATAR_DIR, VISITS_FILE, TOTAL, SUBS, PHASE_NAME } = ctx;

  /* ================= 用户存储（JSON 文件） ================= */
  const USERS_FILE = path.join(DATA_DIR, "users.json");
  function loadUsers() {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); } catch (e) { return []; }
  }
  let users = loadUsers();
  function saveUsers() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = USERS_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(users, null, 1));
    fs.renameSync(tmp, USERS_FILE);
  }

  function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 32).toString("hex"); }
  function parseYmd(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function validUsername(s) { return typeof s === "string" && /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/.test(s); }
  function validPassword(s) { return typeof s === "string" && s.length >= 6 && s.length <= 64; }

  /* ================= 头像 API（独立 512KB 解析器，须在全局 64KB 之前） ================= */
  const AVATAR_MIMES = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  function clearAvatarFiles(u) {
    for (const e of Object.keys(AVATAR_MIMES)) {
      try { fs.unlinkSync(path.join(AVATAR_DIR, u.id + "." + e)); } catch (_) {}
    }
  }
  app.post("/api/avatar", express.json({ limit: "512kb" }), (req, res) => {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ error: "未登录" });
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec((req.body && req.body.data) || "");
    if (!m) return res.status(400).json({ error: "仅支持 JPG / PNG / WebP 图片" });
    const buf = Buffer.from(m[2], "base64");
    if (buf.length < 64) return res.status(400).json({ error: "图片内容无效" });
    if (buf.length > 300 * 1024) return res.status(413).json({ error: "图片过大（≤300KB，上传时已自动压缩）" });
    clearAvatarFiles(u);
    fs.writeFileSync(path.join(AVATAR_DIR, u.id + "." + m[1]), buf);
    u.avatar = m[1];
    u.updatedAt = Date.now();
    saveUsers();
    res.json({ ok: true, avatar: true, updatedAt: u.updatedAt });
  });
  app.delete("/api/avatar", (req, res) => {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ error: "未登录" });
    clearAvatarFiles(u);
    delete u.avatar;
    u.updatedAt = Date.now();
    saveUsers();
    res.json({ ok: true, avatar: false });
  });
  app.get("/api/avatar/:username", (req, res) => {
    const u = users.find(x => x.username === req.params.username);
    if (!u || !u.avatar || !AVATAR_MIMES[u.avatar]) return res.status(404).end();
    const f = path.join(AVATAR_DIR, u.id + "." + u.avatar);
    if (!f.startsWith(AVATAR_DIR)) return res.status(403).end();
    fs.readFile(f, (err, data) => {
      if (err) return res.status(404).end();
      res.writeHead(200, { "Content-Type": AVATAR_MIMES[u.avatar], "Cache-Control": "public, max-age=60" });
      res.end(data);
    });
  });

  /* ================= 单词背诵 API（每用户一份 JSON，个人隔离；须在全局 64KB 解析器之前） ================= */
  const VOCAB_DIR = path.join(DATA_DIR, "vocab");
  const VOCAB_MAX = 5000;
  function vocabPath(u) { return path.join(VOCAB_DIR, u.id + ".json"); }
  function loadVocab(u) {
    try {
      const d = JSON.parse(fs.readFileSync(vocabPath(u), "utf8"));
      return { r: (d && d.r) ? d.r : {}, meta: (d && d.meta) ? d.meta : {} };
    } catch (e) { return { r: {}, meta: {} }; }
  }
  function saveVocab(u, r, meta) {
    fs.mkdirSync(VOCAB_DIR, { recursive: true });
    const p = vocabPath(u), tmp = p + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify({ r, meta: meta || {}, t: Date.now() }));
    fs.renameSync(tmp, p);
  }
  function sanitizeRec(w, s) {
    if (!s || typeof s !== "object" || typeof w !== "string" || !/^[a-zA-Z][a-zA-Z' -]{0,39}$/.test(w)) return null;
    const str = (v, n) => (typeof v === "string" && v.length <= n) ? v : undefined;
    const r = {
      w,
      stage: Math.min(Math.max(Math.floor(+s.stage) || 0, 0), 6),
      due: Math.max(+s.due || 0, 0),
      added: Math.max(+s.added || Date.now(), 0),
      last: Math.max(+s.last || 0, 0),
      ok: Math.max(Math.floor(+s.ok) || 0, 0),
      ng: Math.max(Math.floor(+s.ng) || 0, 0),
      seed: s.seed ? 1 : 0
    };
    const f = (key, n) => { const v = str(s[key], n); if (v !== undefined) r[key] = v; };
    f("ipa", 24); f("pos", 12); f("zh", 140); f("ex", 220); f("exZh", 220); f("uZh", 140);
    return r;
  }
  app.post("/api/vocab", express.json({ limit: "2mb" }), (req, res) => {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ error: "未登录" });
    const body = req.body || {};
    const inR = body.r;
    if (!inR || typeof inR !== "object" || Array.isArray(inR)) return res.status(400).json({ error: "词库格式错误" });
    const keys = Object.keys(inR);
    if (keys.length > VOCAB_MAX) return res.status(413).json({ error: "词库过大（≤" + VOCAB_MAX + " 词）" });
    const out = {};
    for (const k of keys) { const rec = sanitizeRec(k, inR[k]); if (rec) out[k] = rec; }
    /* 学习元数据：每日打卡日志 / 设置 / 词书游标（白名单净化） */
    const meta = {};
    if (body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)) {
      if (body.meta.settings && typeof body.meta.settings === "object") {
        meta.settings = { dailyNew: Math.min(Math.max(Math.floor(+body.meta.settings.dailyNew) || 20, 5), 60) };
      }
      if (Number.isFinite(+body.meta.cursor)) meta.cursor = Math.max(Math.floor(+body.meta.cursor), 0);
      if (body.meta.dailyLog && typeof body.meta.dailyLog === "object" && !Array.isArray(body.meta.dailyLog)) {
        const log = {};
        for (const d of Object.keys(body.meta.dailyLog).slice(0, 400)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
          const e = body.meta.dailyLog[d] || {};
          log[d] = { n: Math.max(Math.floor(+e.n) || 0, 0), r: Math.max(Math.floor(+e.r) || 0, 0) };
        }
        meta.dailyLog = log;
      }
    }
    u.vocabAt = Date.now();
    saveUsers(); saveVocab(u, out, meta);
    res.json({ ok: true, updatedAt: u.vocabAt });
  });
  app.get("/api/vocab", (req, res) => {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ error: "未登录" });
    const d = loadVocab(u);
    res.json({ r: d.r, meta: d.meta, updatedAt: u.vocabAt || null });
  });
  app.get("/api/vocab/due", (req, res) => {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ error: "未登录" });
    const d = loadVocab(u), now = Date.now();
    let due = 0, total = 0;
    for (const k in d.r) { total++; if (d.r[k].due <= now) due++; }
    res.json({ due, total });
  });

  /* 敏感文件防护（必须先于静态服务；含本模块自身，不对公网暴露服务端代码） */
  app.use(express.json({ limit: "64kb" }));
  app.use((req, res, next) => {
    if (/^\/(ssl|data|node_modules)(\/|$)/.test(req.path) ||
        /^\/(server\.js|package\.json|package-lock\.json|\.gitignore)$/.test(req.path) ||
        /^\/function\/api\/index\.js$/.test(req.path)) {
      return res.status(403).end("Forbidden");
    }
    next();
  });

  function currentUser(req) {
    if (!req.session || !req.session.uid) return null;
    return users.find(u => u.id === req.session.uid) || null;
  }
  function publicUser(u) {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const start = parseYmd(u.start) || new Date(2026, 8, 9);
    const day = Math.floor((t0 - start) / 864e5) + 1;
    let phase = null, sub = null, status;
    if (day < 1) status = "未启程";
    else if (day > 160) status = "已结束";
    else {
      const hit = SUBS.find(x => day >= x.first && day <= x.last);
      sub = { no: hit.no, name: hit.name };
      phase = { no: hit.no[0] === "1" ? "PHASE 1" : "PHASE 2", name: PHASE_NAME[hit.no[0]] };
      status = "Day " + day;
    }
    const doneN = Object.keys(u.done || {}).length;
    return {
      username: u.username,
      displayName: u.displayName,
      avatar: !!u.avatar,
      doneN, total: TOTAL,
      percent: Math.min(100, Math.round(doneN / TOTAL * 100)),
      day: Math.min(Math.max(day, 0), 161),
      status, phase, sub,
      start: u.start,
      updatedAt: u.updatedAt || null
    };
  }

  /* ================= 认证 API ================= */
  app.post("/api/register", (req, res) => {
    const { username, password, displayName } = req.body || {};
    if (!validUsername(username)) return res.status(400).json({ error: "用户名需 2–20 位中文、字母、数字或下划线" });
    if (!validPassword(password)) return res.status(400).json({ error: "密码至少 6 位" });
    if (users.some(u => u.username === username)) return res.status(409).json({ error: "用户名已存在" });
    const salt = crypto.randomBytes(16).toString("hex");
    const user = {
      id: crypto.randomUUID(),
      username,
      salt,
      passHash: hashPw(password, salt),
      displayName: (typeof displayName === "string" && displayName.trim() && displayName.trim().length <= 12) ? displayName.trim() : username,
      start: "2026-09-09",
      done: {},
      updatedAt: null,
      createdAt: Date.now()
    };
    users.push(user); saveUsers();
    req.session.regenerate(() => {
      req.session.uid = user.id;
      res.status(201).json({ ok: true, username, displayName: user.displayName });
    });
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body || {};
    const u = users.find(x => x.username === username);
    if (!u) return res.status(401).json({ error: "用户名或密码错误" });
    const ok = crypto.timingSafeEqual(Buffer.from(u.passHash, "hex"), Buffer.from(hashPw(password || "", u.salt), "hex"));
    if (!ok) return res.status(401).json({ error: "用户名或密码错误" });
    req.session.regenerate(() => {
      req.session.uid = u.id;
      res.json({ ok: true, username: u.username, displayName: u.displayName });
    });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/me", (req, res) => {
    const u = currentUser(req);
    if (!u) return res.json({ user: null });
    res.json({
      user: { username: u.username, displayName: u.displayName, avatar: !!u.avatar, updatedAt: u.updatedAt || null },
      progress: { done: u.done || {}, start: u.start, updatedAt: u.updatedAt }
    });
  });

  /* ================= 进度同步 ================= */
  app.post("/api/progress", (req, res) => {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ error: "未登录" });
    const { done, start } = req.body || {};
    if (!done || typeof done !== "object" || Array.isArray(done)) return res.status(400).json({ error: "进度格式错误" });
    const clean = {};
    for (const k in done) { if (/^w\d+(-rd|-d\d+-\d+)?$/.test(k) && done[k]) clean[k] = 1; }
    if (start && /^\d{4}-\d{2}-\d{2}$/.test(start)) u.start = start;
    u.done = clean;
    u.updatedAt = Date.now();
    saveUsers();
    res.json({ ok: true, updatedAt: u.updatedAt });
  });

  /* 同学进度（需登录），按完成率降序；附带每人已背单词数 vc */
  app.get("/api/users", (req, res) => {
    const me = currentUser(req);
    if (!me) return res.status(401).json({ error: "未登录" });
    const list = users.map((u) => {
      const p = publicUser(u);
      p.vc = Object.keys(loadVocab(u).r).length;
      return p;
    });
    list.sort((a, b) => b.percent - a.percent || b.doneN - a.doneN || (b.updatedAt || 0) - (a.updatedAt || 0));
    res.json({ users: list });
  });

  /* ================= 公开进度查询（/用户名=密码 → 该账号进度 JSON，无需登录态） ================= */
  function localYmd() {
    const t = new Date();
    return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  }
  function localYmdMs(ms) {
    const d = new Date(ms);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  /* 词书缓存（与前端 loadBook 同源同过滤，mtime 变化自动重读） */
  let BOOK_CACHE = null;
  function loadBook() {
    try {
      const f = path.join(ROOT, "function", "english", "词汇表_按文章出现顺序.txt");
      const st = fs.statSync(f);
      if (BOOK_CACHE && BOOK_CACHE.mtime === st.mtimeMs) return BOOK_CACHE.list;
      const list = fs.readFileSync(f, "utf8").split(/\r?\n/).map(s => s.trim()).filter(s => /^[a-zA-Z][a-zA-Z' -]{0,39}$/.test(s));
      BOOK_CACHE = { mtime: st.mtimeMs, list };
      return list;
    } catch (e) { return []; }
  }
  /* 浏览器友好视图：手机/电脑直接打开即排版进度页 + API 说明 */
  function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function renderProgressHtml(o) {
    const e = o.english, c = o.checkin, u = o.user;
    const CLS = { "已巩固": "strong", "待复习": "due", "未学习": "unk" };
    const chip = x => '<span class="c ' + (CLS[x.s] || "lrn") + '">' + escHtml(x.w) +
      (x.due ? "<i>" + escHtml(x.due.slice(5)) + "</i>" : "") + "</span>";
    const chips = a => a.length ? a.map(chip).join("") : '<p class="empty">无</p>';
    const fmt = ms => ms ? new Date(ms).toLocaleString("zh-CN", { hour12: false }) : "—";
    const kpi = (n, t) => '<div class="k"><b>' + n + "</b><span>" + t + "</span></div>";
    return '<!doctype html><html lang="zh"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<title>学习进度 · " + escHtml(u.displayName) + "</title><style>" +
      "*{box-sizing:border-box;margin:0}" +
      "body{font:15px/1.6 system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:#222;background:#f6f5f2;padding:20px 14px 40px}" +
      "main{max-width:720px;margin:0 auto}h1{font-size:20px;margin-bottom:2px}" +
      ".who{color:#888;font-size:13px;margin-bottom:16px}" +
      ".card{background:#fff;border:1px solid #e7e5e0;border-radius:12px;padding:16px 18px;margin-bottom:14px}" +
      "h2{font-size:15px;margin-bottom:10px}.big{font-size:28px;font-weight:700}" +
      ".sub{color:#888;font-size:13px}.bar{height:8px;background:#eee;border-radius:99px;margin:10px 0 4px;overflow:hidden}" +
      ".bar i{display:block;height:100%;background:#b0342c;border-radius:99px}" +
      ".kpis{display:flex;flex-wrap:wrap;gap:10px 22px;margin:8px 0}.k b{font-size:20px;display:block}.k span{color:#888;font-size:12px}" +
      ".c{display:inline-block;padding:2px 10px;border-radius:99px;font-size:13px;margin:0 6px 6px 0;background:#f2f1ee;color:#555}" +
      ".c i{font-style:normal;font-size:11px;opacity:.65;margin-left:3px}" +
      ".c.strong{background:#e5f3ea;color:#1a7f4b}.c.due{background:#fceae8;color:#b0342c}.c.lrn{background:#faf3dc;color:#8a6d1a}" +
      ".empty{color:#aaa;font-size:13px}" +
      "details summary{cursor:pointer;font-weight:600;font-size:15px}" +
      "table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-top:1px solid #eee;padding:6px 8px;text-align:left;vertical-align:top}th{color:#888;font-weight:600;white-space:nowrap}" +
      "code{background:#f2f1ee;padding:1px 6px;border-radius:6px;font-size:12px;word-break:break-all}" +
      "a{color:#b0342c;text-decoration:none}" +
      "@media(prefers-color-scheme:dark){body{background:#151515;color:#ddd}.card{background:#1e1e1e;border-color:#333}.c{background:#2a2a2a;color:#bbb}.c.strong{background:#15321f;color:#7ed6a2}.c.due{background:#3a201d;color:#f0968c}.c.lrn{background:#332c14;color:#d9c06c}code{background:#2a2a2a}a{color:#f0968c}}" +
      "</style></head><body><main>" +
      "<h1>StudyPad 学习进度</h1>" +
      '<p class="who">@' + escHtml(u.username) + " · " + escHtml(u.displayName) + " · " + escHtml(c.today) + "</p>" +
      '<div class="card"><h2>打卡进度</h2><div class="big">' + escHtml(c.status) + "</div>" +
      '<div class="sub">' + escHtml(c.phase ? c.phase.name + " · " + c.sub.no + " " + c.sub.name : c.status) + "</div>" +
      '<div class="bar"><i style="width:' + c.percent + '%"></i></div>' +
      '<div class="sub">已打卡 ' + c.doneN + " / " + c.total + "（" + c.percent + "%）· 开始于 " + escHtml(c.start || "—") + " · 更新于 " + fmt(o.updatedAt.checkin) + "</div></div>" +
      '<div class="card"><h2>英语进度</h2><div class="kpis">' +
      kpi(e.words, "词库单词") + kpi(e.strong, "已巩固") + kpi(e.learning, "学习中") + kpi(e.fresh, "生词") + kpi(e.due, "待复习") + "</div>" +
      '<div class="sub">今日新学 ' + e.today.n + " · 今日复习 " + e.today.r + " · 词书游标 " + e.bookCursor + " / 1506 · 累计答对 " + e.answers.ok + " 错 " + e.answers.ng + " · 连续 " + e.days + " 天有记录 · 更新于 " + fmt(o.updatedAt.vocab) + "</div></div>" +
      '<div class="card"><h2>今日需学（' + e.todayNew.length + " / " + e.dailyNew + "）</h2>" + chips(e.todayNew) + "</div>" +
      '<div class="card"><h2>今日待复习（' + e.dueWords.length + "）</h2>" + chips(e.dueWords) + "</div>" +
      '<div class="card"><h2>今日已学（' + e.todayLearned.length + "）</h2>" + chips(e.todayLearned) + "</div>" +
      '<details class="card"><summary>全部单词本（' + e.book.length + " 词，点击展开）</summary>" +
      '<div style="margin-top:10px">' + chips(e.book) + (e.extra.length ? "<p class=\"sub\" style=\"margin:8px 0 4px\">词书外收录（" + e.extra.length + "）</p>" + chips(e.extra) : "") + "</div></details>" +
      '<div class="card"><h2>API</h2><div class="sub">本页数据来自进度查询 API（程序访问本地址即 JSON）。' +
      '<a href="/api/">完整 API 文档（含接入 OpenClaw、AI 使用方法）→</a></div></div>' +
      '<p class="who">StudyPad · study.lovecacx.icu</p></main></body></html>';
  }
  app.get(/^\/[^/]*=/, (req, res) => {
    let seg;
    try { seg = decodeURIComponent(req.path.slice(1)); } catch (e) { seg = req.path.slice(1); }
    const eq = seg.indexOf("=");
    const username = eq > 0 ? seg.slice(0, eq) : "";
    const password = eq > 0 ? seg.slice(eq + 1) : "";
    const u = users.find(x => x.username === username);
    let ok = false;
    if (u) ok = crypto.timingSafeEqual(Buffer.from(u.passHash, "hex"), Buffer.from(hashPw(password, u.salt), "hex"));
    if (!ok) return res.status(401).json({ error: "用户名或密码错误" });

    /* 打卡学习进度（复用 publicUser 口径 + 已打卡任务清单） */
    const c = publicUser(u);
    c.today = localYmd();
    c.done = Object.keys(u.done || {}).sort();
    delete c.avatar;

    /* 英语学习进度（词库统计，口径与单词页一致：stage≥6 已巩固 / 0 生词 / 其余学习中） */
    const v = loadVocab(u), now = Date.now();
    let strong = 0, fresh = 0, learning = 0, due = 0, okSum = 0, ngSum = 0;
    for (const k in v.r) {
      const r = v.r[k];
      if (r.stage >= 6) strong++; else if (r.stage === 0) fresh++; else learning++;
      if (r.stage < 6 && r.due <= now) due++;
      okSum += r.ok; ngSum += r.ng;
    }
    const log = v.meta.dailyLog || {};
    const days = Object.keys(log).sort();
    let nSum = 0, rSum = 0;
    for (const d of days) { nSum += log[d].n || 0; rSum += log[d].r || 0; }

    /* 单词清单（与前端 nextNewWords / 待复习筛选同口径） */
    const dailyNew2 = (v.meta.settings && v.meta.settings.dailyNew) || 20;
    const BOOK = loadBook();
    const statusOf = r => r.stage >= 6 ? "已巩固" : (r.due <= now ? "待复习" : "第" + (r.stage + 1) + "轮");
    const brief = (k, r) => { const o = { w: k, s: statusOf(r) }; if (r.stage < 6) o.due = localYmdMs(r.due); return o; };
    /* 今日需学新词：从词书游标起顺序取未收录词，≤每日新词量 */
    const todayNew = [];
    for (let i = v.meta.cursor || 0; i < BOOK.length && todayNew.length < dailyNew2; i++) {
      const w = BOOK[i].toLowerCase();
      if (!v.r[w]) todayNew.push({ w, idx: i });
    }
    /* 今日已学（今天新收进的词）与今日待复习（到期词按到期日升序） */
    const t0ms = new Date(); t0ms.setHours(0, 0, 0, 0);
    const todayLearned = [], dueWords = [], inBook = new Set();
    for (const k in v.r) {
      const r = v.r[k];
      if (r.added >= t0ms.getTime()) todayLearned.push(brief(k, r));
      if (r.stage < 6 && r.due <= now) dueWords.push(brief(k, r));
    }
    todayLearned.sort((a, b) => a.w < b.w ? -1 : 1);
    dueWords.sort((a, b) => a.due < b.due ? -1 : a.due > b.due ? 1 : (a.w < b.w ? -1 : 1));
    /* 全部单词本（1506 词按词书顺序，每词带状态）+ 收录但不在词书的词 */
    const book = [];
    for (let i = 0; i < BOOK.length; i++) {
      const w = BOOK[i].toLowerCase();
      inBook.add(w);
      book.push(v.r[w] ? brief(w, v.r[w]) : { w, s: "未学习" });
    }
    const extra = [];
    for (const k in v.r) if (!inBook.has(k)) extra.push(brief(k, v.r[k]));
    extra.sort((a, b) => a.w < b.w ? -1 : 1);

    const out = {
      ok: true,
      user: { username: u.username, displayName: u.displayName },
      checkin: {
        day: c.day, status: c.status, phase: c.phase, sub: c.sub, start: c.start, today: c.today,
        doneN: c.doneN, total: c.total, percent: c.percent, done: c.done
      },
      english: {
        words: Object.keys(v.r).length,
        strong, learning, fresh, due,
        answers: { ok: okSum, ng: ngSum },
        bookCursor: v.meta.cursor || 0,
        dailyNew: dailyNew2,
        today: log[c.today] || { n: 0, r: 0 },
        days: days.length, newSum: nSum, reviewSum: rSum,
        dailyLog: log,
        todayNew, todayLearned, dueWords, book, extra
      },
      updatedAt: { checkin: u.updatedAt || null, vocab: u.vocabAt || null }
    };
    if (req.query.pretty !== undefined) {
      res.type("application/json; charset=utf-8").send(JSON.stringify(out, null, 2));
    } else if (req.query.json === undefined && (req.headers.accept || "").includes("text/html")) {
      res.type("text/html; charset=utf-8").send(renderProgressHtml(out));
    } else {
      res.json(out);
    }
  });

  /* API 文档页（/api、/api/ → function/api/index.html） */
  app.get(/^\/api\/?$/, (req, res) => res.sendFile(path.join(ROOT, "function", "api", "index.html")));

  /* 浏览量（存 data/visits.json，按页面 key 计数；无需登录） */
  const VISITS_KEY = /^[a-z0-9-]{1,24}$/;
  function readVisits() {
    try { return JSON.parse(fs.readFileSync(VISITS_FILE, "utf8")); } catch (e) { return {}; }
  }
  app.post("/api/visits", (req, res) => {
    const page = req.body && req.body.page;
    if (typeof page !== "string" || !VISITS_KEY.test(page)) return res.status(400).json({ error: "page 参数非法" });
    const v = readVisits();
    v[page] = (v[page] || 0) + 1;
    try { fs.writeFileSync(VISITS_FILE, JSON.stringify(v)); } catch (e) {}
    res.json({ ok: true, total: v[page] });
  });
  app.get("/api/visits", (req, res) => {
    const page = req.query.page;
    if (typeof page !== "string" || !VISITS_KEY.test(page)) return res.status(400).json({ error: "page 参数非法" });
    res.json({ total: readVisits()[page] || 0 });
  });
};
