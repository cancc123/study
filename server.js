const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");

const ROOT = __dirname;
const PORT = 8084;
const HTTP_PORT = 8085;
/* 数据目录：默认 ROOT/data；测试经 STUDY_DATA_DIR 注入隔离目录，绝不触碰真实数据 */
const DATA_DIR = process.env.STUDY_DATA_DIR || path.join(ROOT, "data");
const SECRET_FILE = path.join(DATA_DIR, "session-secret.txt");
const AVATAR_DIR = path.join(DATA_DIR, "avatars");
const VISITS_FILE = path.join(DATA_DIR, "visits.json");
/* 子阶段日区间表（用于计算「当前阶段」，与前端数据口径一致） */
const SUBS = [
  { no: "1.1", name: "筑基起步", first: 1, last: 28 },
  { no: "1.2", name: "基础强化", first: 29, last: 70 },
  { no: "1.3", name: "系统进阶", first: 71, last: 105 },
  { no: "1.4", name: "整合与真题一刷", first: 106, last: 130 },
  { no: "2.1", name: "全真模考与真题二刷", first: 131, last: 138 },
  { no: "2.2", name: "限时成套真题", first: 139, last: 145 },
  { no: "2.3", name: "薄弱强化与时政突击", first: 146, last: 152 },
  { no: "2.4", name: "全真模拟与考前调整", first: 153, last: 160 }
];
const PHASE_NAME = { "1": "第一阶段 · 系统学习", "2": "第二阶段 · 冲刺复习" };
/* 全周期任务总数（与前端数据一致） */
const TOTAL = 596;

/* 会话密钥：首次生成并持久化 */
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(AVATAR_DIR, { recursive: true });
let SECRET;
try { SECRET = fs.readFileSync(SECRET_FILE, "utf8").trim(); } catch (e) {}
if (!SECRET || SECRET.length < 32) {
  SECRET = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_FILE, SECRET);
}

/* ================= 应用 ================= */
const app = express();
app.disable("x-powered-by");
app.use(session({
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_INSECURE !== "1",
    maxAge: 30 * 864e5
  }
}));

/* ================= API（全部接口在 function/api/index.js，含 /api/* 与 /用户名=密码 进度查询） ================= */
require("./function/api")(app, { ROOT, DATA_DIR, AVATAR_DIR, VISITS_FILE, TOTAL, SUBS, PHASE_NAME });

/* 单词背诵页（子目录默认页） */
app.get(/^\/function\/english\/?$/, (req, res) => {
  if (req.path.slice(-1) !== "/") return res.redirect("/function/english/");
  res.sendFile(path.join(ROOT, "function", "english", "index.html"));
});

/* 语文复习页（子目录默认页） */
app.get(/^\/function\/chinese\/?$/, (req, res) => {
  if (req.path.slice(-1) !== "/") return res.redirect("/function/chinese/");
  res.sendFile(path.join(ROOT, "function", "chinese", "index.html"));
});

/* 关于本站页（子目录默认页） */
app.get(/^\/function\/about\/?$/, (req, res) => {
  if (req.path.slice(-1) !== "/") return res.redirect("/function/about/");
  res.sendFile(path.join(ROOT, "function", "about", "index.html"));
});

/* 静态资源（根路径默认打开打卡清单；/login 等可省略 .html） */
app.use(express.static(ROOT, { index: "index.html", extensions: ["html"] }));

app.use((req, res) => res.status(404).send("404 Not Found"));
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") return res.status(400).json({ error: "请求格式错误" });
  console.error(err);
  res.status(500).send("Server Error");
});

/* ================= 启动（仅直接运行时） ================= */
if (require.main === module) {
  const https = require("https");
  const http = require("http");
  try {
    const opts = {
      key: fs.readFileSync(path.join(ROOT, "ssl", "key.pem")),
      cert: fs.readFileSync(path.join(ROOT, "ssl", "fullchain.pem"))
    };
    https.createServer(opts, app).listen(PORT, "::", () => {
      console.log(`HTTPS server running at https://[::1]:${PORT}/ (IPv6)`);
      console.log(`域名: https://study.lovecacx.icu:${PORT} · 局域网: https://<本机IP>:${PORT}`);
    });
  } catch (e) {
    console.error(`无法加载 SSL 证书：${e.message}`);
    process.exit(1);
  }
  const httpRedir = http.createServer((req, res) => {
    const host = (req.headers.host || "").split(":")[0] || "[::1]";
    res.writeHead(301, { Location: `https://${host}:${PORT}${req.url}` });
    res.end();
  });
  httpRedir.on("error", (e) => console.warn(`HTTP 跳转端口 ${HTTP_PORT} 不可用（${e.code}），已跳过`));
  httpRedir.listen(HTTP_PORT, "::", () => console.log(`HTTP redirect :${HTTP_PORT} → :${PORT}`));
}

module.exports = app;
