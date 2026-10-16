// ほしみるナビ：静的サイトを dist/ に書き出す
// 使い方: node scripts/build.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "site");
const OUT = path.join(ROOT, "dist");
const core = require(path.join(SRC, "assets", "core.js"));
const { PLACES, CONS, FIG, FAMOUS, MYTH, SITE, REGIONS, esc } = core;

const readJSON = f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const WEATHER = readJSON(path.join(SRC, "data", "weather.json"));
const BUILD_TIME = new Date();
const [Y] = core.jstNow();
const TOKYO = 12;

// ---------- 共通パーツ ----------
const ASSET_V = Date.now().toString(36);
function head({ title, desc, url, noindex = false, jsonld = [] }) {
  const ads = SITE.adsenseClient
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}" crossorigin="anonymous"></script>`
    : "";
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE.url}${url}">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE.url}${url}">
<meta property="og:image" content="${SITE.url}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@zundamon_space">
<meta name="theme-color" content="#0b1424">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Antique+B1&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=${ASSET_V}">
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
${ads}
</head>
<body>
<canvas id="bg" aria-hidden="true"></canvas>
<div class="wrap">`;
}

function topbar() {
  return `  <header class="top">
    <a class="brand" href="/">${SITE.name}</a>
    <div class="search">
      <span class="now" id="topday"></span>
      <div class="combo"><input type="search" id="loc" placeholder="都道府県・市で検索" autocomplete="off" aria-label="場所を検索" role="combobox" aria-expanded="false" aria-controls="locpop"><div class="pop" id="locpop" role="listbox" hidden></div></div>
    </div>
  </header>`;
}

function crumbs(items) {
  return `<nav class="crumbs" aria-label="パンくずリスト"><a href="/">トップ</a>${items.map(([t, u]) => u ? ` › <a href="${u}">${esc(t)}</a>` : ` › <span>${esc(t)}</span>`).join("")}</nav>`;
}
function crumbsLD(items) {
  const list = [["トップ", "/"], ...items];
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: list.map(([t, u], i) => ({ "@type": "ListItem", position: i + 1, name: t, ...(u ? { item: SITE.url + u } : {}) })) };
}

function footer() {
  const regions = REGIONS.map(([s], k) => {
    const e = k + 1 < REGIONS.length ? REGIONS[k + 1][0] : PLACES.length;
    return `<div><b>${REGIONS[k][1]}</b><p>${PLACES.slice(s, e).map(p => `<a href="/pref/${p.slug}/">${p.p}</a>`).join("")}</p></div>`;
  }).join("");
  const seasons = ["春の星座", "夏の星座", "秋の星座", "冬の星座", "一年中見える星座"].map(s =>
    `<div><b>${s}</b><p>${CONS.filter(C => !C.mw && C.season === s && C.lv <= 2).map(C => `<a href="/seiza/${C.slug}/">${C.short}</a>`).join("")}</p></div>`).join("");
  return `  <footer class="foot">
    <section class="links"><h2>都道府県の星空</h2><div class="linkgrid">${regions}</div></section>
    <section class="links"><h2>主な星座</h2><div class="linkgrid">${seasons}</div><p><a href="/seiza/">88星座の一覧を見る →</a>　<a href="/event/">流星群カレンダー →</a></p></section>
    <nav class="footnav"><a href="/about/">運営者情報</a><a href="/privacy/">プライバシーポリシー</a><a href="/contact/">お問い合わせ</a><a href="${SITE.youtube}" target="_blank" rel="noopener">YouTube</a><a href="${SITE.x}" target="_blank" rel="noopener">X</a></nav>
    <p class="fine">※当サイトはアフィリエイト広告を利用しています。<br>雲の予報：<a href="https://api.met.no/" target="_blank" rel="noopener">MET Norway</a>（CC BY 4.0）のデータをもとに加工。日の入り・薄明・月・星座の位置は当サイトで計算しています。予報は外れることがあります。<br>© ${Y} ${SITE.name}</p>
  </footer>`;
}

function tail(init) {
  return `</div>
<script>window.HM_INIT=${JSON.stringify(init || {})};window.HM_SHOP=${JSON.stringify(SHOP_QUICK)};</script>
<script src="/assets/core.js?v=${ASSET_V}"></script>
<script src="/assets/app.js?v=${ASSET_V}"></script>
</body>
</html>`;
}

// ---------- アプリ本体（サーバー側で今夜の答えを先に入れておく）----------
function answerHTML(pi, qTag = "div") {
  const P = PLACES[pi], S = core.summary(pi, 0, WEATHER);
  return `  <section class="answer" aria-live="polite">
    <${qTag} class="q" id="q">${core.dayLabel(0)}、${P.label}で星はいつ見える？</${qTag}>
    <p class="h1" id="headline">${S.head}</p>
    <div class="why" id="why">${S.why}</div>
  </section>`;
}

// もしもアフィリエイト経由の商品リンク（Amazonが承認されたらAmazonを優先）
function shopLink(q) {
  const m = SITE.moshimoAmazon, r = SITE.moshimoRakuten;
  const wrap = (id, url) => `https://af.moshimo.com/af/c/click?a_id=${id.a_id}&p_id=${id.p_id}&pc_id=${id.pc_id}&pl_id=${id.pl_id}&url=${encodeURIComponent(url)}`;
  if (m) return { href: wrap(m, `https://www.amazon.co.jp/s?k=${encodeURIComponent(q)}`), shop: "Amazon" };
  if (r) return { href: wrap(r, `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(q)}/`), shop: "楽天" };
  return null;
}
// 流星群の前日・当日の案内に出す「持ち物チェック」
const SHOP_QUICK = [["レジャーシート", "レジャーシート 厚手 大判"], ["赤いライト", "赤色ライト 天体観測"], ["カイロ・ブランケット", "アウトドア ブランケット"]]
  .map(([n, q]) => { const L = shopLink(q); return L ? { n, href: L.href, shop: L.shop } : null; }).filter(Boolean);
function kitHTML() {
  const groups = [
    ["流星群に出かける前に", [
      ["レジャーシートか寝袋", "寝転んで空全体を見るのが一番", "レジャーシート 厚手 大判"],
      ["赤いライト", "白い光だと、目が暗さに慣れ直すのに15分以上かかる", "赤色ライト 天体観測"],
      ["カイロ・ブランケット", "夜は思った以上に冷える。2時間じっとしていると体が冷え切る", "アウトドア ブランケット"]]],
    ["星座をもっと楽しむなら", [
      ["星座早見盤", "空と見比べながら星座を探せる。1,000円前後から", "星座早見盤"],
      ["双眼鏡（7×50か8×42）", "すばるや天の川の星の粒が、肉眼とは別世界に見える", "双眼鏡 7x50 天体観測"]]]
  ];
  const any = !!shopLink("x");
  const li = ([a, b, q]) => { const L = shopLink(q); return `<li><div><b>${a}</b><span>${b}</span></div>${L ? `<a class="shopbtn" href="${L.href}" target="_blank" rel="sponsored nofollow noopener">${L.shop}で見る</a>` : ""}</li>`; };
  return `<div class="kit">${any ? '<span class="lbl">PR（アフィリエイト広告を含みます）</span>' : ""}
        ${groups.map(([h, items]) => `<strong>${h}</strong><ul>${items.map(li).join("")}</ul>`).join("\n        ")}
        ${any ? `<span class="lbl">リンク先は${shopLink("x").shop}の検索結果です</span>` : ""}</div>`;
}

function targetPanel(staticCard = "") {
  return `  <section id="find">
    <h2>見たいものから探す</h2>
    <p class="sub">星座名を入れると、今夜いつどこを見ればいいか、一年でいつが見頃かが分かります。</p>
    <div class="panel target">
      <div class="combo" style="width:320px"><input type="search" id="tq" placeholder="例：オリオン座、さそり座、天の川" autocomplete="off" aria-label="星座を検索" role="combobox" aria-expanded="false" aria-controls="tpop"><div class="pop" id="tpop" role="listbox" hidden></div></div>
      <div class="quick" id="quick"></div>
      <div id="tcard"${staticCard ? ' data-static="1"' : ""}>${staticCard}</div>
    </div>
  </section>`;
}

function appHTML({ pi = TOKYO, targetFirst = false, staticCard = "", qTag = "div" } = {}) {
  const target = targetPanel(staticCard);
  return `  <div class="days" id="days"></div>
  <div id="alert" hidden></div>
${answerHTML(pi, qTag)}
${targetFirst ? target : ""}
  <section>
    <h2>30分ごとの見え具合</h2>
    <p class="sub">棒をタップすると、その時刻の空が下の星図に出ます。</p>
    <div class="tl">
      <div class="bars" id="bars"></div>
      <div class="ticks" id="ticks"></div>
      <div class="rowlabel">雲（濃いほど多い）</div><div class="rows" id="r-cloud"></div>
      <div class="rowlabel">月明かり（明るいほど邪魔）</div><div class="rows" id="r-moon"></div>
    </div>
    <div class="legend"><span><i style="background:var(--good)"></i>よく見える</span><span><i style="background:var(--mid)"></i>まあまあ</span><span><i style="background:var(--bad)"></i>厳しい</span></div>
  </section>

  <section>
    <h2>この時間に見える星座</h2>
    <p class="sub">寝転んで空を見上げた向きの星図です（上が北、左が東）。星座名をタップすると詳しく出ます。</p>
    <div class="skywrap">
      <div class="dome">
        <canvas id="dome" width="760" height="760" aria-label="全天の星座の位置"></canvas>
        <div class="slider"><label for="slot" class="kv">時刻</label><input type="range" id="slot" min="0" max="25" step="1"><output id="slotout"></output></div>
      </div>
      <div style="min-width:0"><div class="vishead" id="vishead"></div><ul class="vis" id="vis" aria-label="今夜見やすい星座"></ul></div>
    </div>
  </section>
${targetFirst ? "" : target}
  <section>
    <h2>月と暗い夜のカレンダー</h2>
    <p class="sub">月明かりがあると、暗い星は見えなくなります。金色の線が付いた日は、星を見る人が多い夜9時から深夜1時まで月が沈んでいて、空が暗い夜です。</p>
    <div class="mooncal">
      <div class="moonside"><div class="moon"><canvas id="moonc" width="64" height="64" aria-hidden="true"></canvas><dl class="mstats" id="mooninfo"></dl></div><div class="darknext" id="darknext"></div></div>
      <div class="calwrap"><div class="cal" id="cal"></div></div>
    </div>
  </section>

  <section>
    <h2>これからの天体イベント</h2>
    <div class="evwrap">
      <ul class="ev" id="events"></ul>
      ${kitHTML()}
    </div>
  </section>

  <section class="yt" id="ytbox" aria-label="YouTubeチャンネル">
    <div class="thumb"><span>宇宙と謎のずんだ研究所</span></div>
    <div class="body">
      <span class="eb">YOUTUBE・宇宙と謎のずんだ研究所</span>
      <h3>宇宙・サイエンス・世界の謎の解説動画</h3>
      <p>宇宙・サイエンス・世界の謎をわかりやすく解説しています。星や宇宙が好きな人はチャンネル登録してね。</p>
      <div class="btns"><a class="ytsub" href="${SITE.youtube}?sub_confirmation=1" target="_blank" rel="noopener">チャンネル登録</a><a class="ytwatch" href="${SITE.youtube}/videos" target="_blank" rel="noopener">動画を見る</a></div>
    </div>
  </section>

  <section class="notify" aria-label="お知らせの受け取り方">
    <div><h2>見逃さないために</h2><p class="sub">どれも無料。登録やアプリのインストールはいりません。</p></div>
    <div class="ways">
      <div><b>イベントをカレンダーに入れる</b><small>上の「これからの天体イベント」の「カレンダーに追加」から。前日にスマホのカレンダーが知らせてくれます。</small></div>
      <div><b>X（旧Twitter）をフォロー</b><small>イベントの当日に「今夜の見頃」をお知らせします。<a class="xlink" href="${SITE.x}" target="_blank" rel="noopener">@zundamon_space</a></small></div>
      <div><b>YouTubeでチャンネル登録</b><small>流星群の前日には、見頃の時間と方角をまとめた短い動画を出します。新しい長い動画もベルの通知で届きます。</small></div>
    </div>
  </section>`;
}

// ---------- 静的な星座カード（JSが動く前・検索エンジン向け）----------
function staticCard(C) {
  const P = PLACES[TOKYO], ms = core.monthsAlt(C, P), maxAlt = 90 - Math.abs(P.lat - C.de);
  const mcls = a => maxAlt < 20 ? (a > 0 && a >= maxAlt - 5 ? "on" : "") : (a >= 45 ? "on" : a >= 20 ? "ok" : "");
  return `<h3>${C.short}</h3><div class="kv">${C.star ? "目印：" + esc(C.star) + "・" : ""}${esc(C.note)}</div>
    ${core.figHTML(C)}
    <div><div class="fact" style="margin-bottom:6px"><span class="l">一年の見頃（東京で毎月15日の夜9時に見える高さ）</span></div><div class="months">${ms.map((a, m) => `<span class="${mcls(a)}">${m + 1}月</span>`).join("")}</div></div>
    ${MYTH[C.n] ? `<div class="myth"><div class="fact"><span class="l">${C.mw ? "天の川の物語" : "星座の物語"}</span></div><p>${esc(MYTH[C.n])}</p></div>` : ""}`;
}

// ---------- ページ書き出し ----------
const pages = [];
function write(url, html, { priority = 0.6, changefreq = "daily" } = {}) {
  const file = path.join(OUT, url, url.endsWith(".html") ? "" : "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (!url.endsWith(".html")) pages.push({ url, priority, changefreq });
}
function rmrf(d) { fs.rmSync(d, { recursive: true, force: true }); }
function copyDir(a, b) { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) { const s = path.join(a, f), t = path.join(b, f); fs.statSync(s).isDirectory() ? copyDir(s, t) : fs.copyFileSync(s, t); } }

rmrf(OUT);
copyDir(path.join(SRC, "assets"), path.join(OUT, "assets"));
copyDir(path.join(SRC, "data"), path.join(OUT, "data"));
for (const f of fs.readdirSync(path.join(SRC, "static"))) fs.copyFileSync(path.join(SRC, "static", f), path.join(OUT, f));

// トップ
write("/", head({
  title: `${SITE.name}｜今夜、星はいつ見える？全国の星空予報と星座ガイド`,
  desc: "今夜何時から星が見えるかを30分ごとに予報。全国47都道府県の星空、今夜見える星座の星図、88星座の見つけ方と神話、流星群の見頃の時間と方角が分かります。",
  url: "/",
  jsonld: [{ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url + "/" }]
}) + topbar() + appHTML({ pi: TOKYO, qTag: "h1" }) + `
  <section class="intro">
    <h2>${SITE.name}について</h2>
    <p>${SITE.name}は、雲の予報・空の暗さ・月明かりを組み合わせて、星が見える時間を30分ごとに予報するサイトです。日の入り後に空が十分暗くなる時刻や、月が沈む時刻も場所ごとに計算しています。上の検索から都道府県を選ぶと、その場所の今夜の見頃と、見える星座の位置が分かります。</p>
  </section>
` + footer() + tail({}), { priority: 1.0, changefreq: "hourly" });

// 都道府県
const prefIndexBody = REGIONS.map(([s], k) => {
  const e = k + 1 < REGIONS.length ? REGIONS[k + 1][0] : PLACES.length;
  return `<h2>${REGIONS[k][1]}</h2><ul class="cards">${PLACES.slice(s, e).map((p, j) => {
    const pi = s + j, S = core.summary(pi, 0, WEATHER);
    return `<li><a href="/pref/${p.slug}/"><b>${p.full}</b><span>${S.best ? "今夜 " + core.windowText(S.slots, S.best) : "今夜は見えにくい"}</span></a></li>`;
  }).join("")}</ul>`;
}).join("");
write("/pref/", head({
  title: `都道府県別 今夜の星空予報｜${SITE.name}`,
  desc: "全国47都道府県の今夜の星空予報。星が見える時間帯を雲・月明かり・空の暗さから予報しています。",
  url: "/pref/", jsonld: [crumbsLD([["都道府県の星空", "/pref/"]])]
}) + topbar() + crumbs([["都道府県の星空"]]) + `<section class="intro"><h1>都道府県別 今夜の星空予報</h1><p>各都道府県の代表地点で、今夜星が見えそうな時間帯をまとめています。地名をクリックすると、30分ごとの見え具合と見える星座の星図が見られます。</p>${prefIndexBody}</section>` + footer() + tail({ place: TOKYO }), { priority: 0.8, changefreq: "hourly" });

PLACES.forEach((P, pi) => {
  const S = core.summary(pi, 0, WEATHER);
  const seasonal = CONS.filter(C => !C.mw && C.lv <= 2).map(C => ({ C, b: core.bestFor(C, S.slots, P) })).filter(o => o.b && o.b.alt >= 30).sort((a, b) => b.b.alt - a.b.alt).slice(0, 8);
  const easyTxt = P.b >= 8 ? "街明かりが強いため、見えるのは明るい星や一等星が中心です" : P.b >= 7 ? "街なかでも明るい星座なら形が分かります" : "少し郊外に出ると、たくさんの星が見えます";
  const desc = `${P.full}（${P.c}）の今夜の星空予報。${S.best ? "今夜は" + core.windowText(S.slots, S.best) + "が見頃。" : ""}星が見える時間を30分ごとに予報し、今夜見える星座や天の川が見える場所（${P.mw}）も紹介します。`;
  write(`/pref/${P.slug}/`, head({
    title: `${P.full}の星空予報｜今夜星が見える時間と見える星座 - ${SITE.name}`,
    desc, url: `/pref/${P.slug}/`, jsonld: [crumbsLD([["都道府県の星空", "/pref/"], [P.full + "の星空", null]])]
  }) + topbar() + crumbs([["都道府県の星空", "/pref/"], [P.full]]) + `
  <section class="intro top-intro"><h1>${P.full}の星空予報</h1></section>
` + appHTML({ pi }) + `
  <section class="intro">
    <h2>${P.full}で星を見るなら</h2>
    <p>${P.full}の代表地点（${P.c}）の空の明るさは、9段階の「ボートル・スケール」で${P.b}ほどです。${easyTxt}。天の川を見たいときは、${esc(P.mw)}のような街明かりの少ない場所まで出かけるのがおすすめです。</p>
    ${seasonal.length ? `<p>今夜${P.full}で見やすい主な星座：${seasonal.map(o => `<a href="/seiza/${o.C.slug}/">${o.C.short}</a>（${core.nx(o.b.t)}${core.fmt(o.b.t)}ごろ・${core.dir(o.b.az)}の空）`).join("、")}</p>` : ""}
  </section>
` + footer() + tail({ place: pi }), { priority: 0.9, changefreq: "hourly" });
});

// 星座
const SEASONS = ["春の星座", "夏の星座", "秋の星座", "冬の星座", "一年中見える星座", "日本からはほぼ見えない星座"];
write("/seiza/", head({
  title: `88星座の一覧と見つけ方｜${SITE.name}`,
  desc: "全88星座の一覧。季節ごとの星座の見つけ方、見頃の月、有名な星、星座の神話をまとめています。",
  url: "/seiza/", jsonld: [crumbsLD([["88星座", "/seiza/"]])]
}) + topbar() + crumbs([["88星座"]]) + `<section class="intro"><h1>88星座の一覧</h1><p>全天にある88の星座を、見やすい季節ごとに分けています。見頃は東京で夜9時ごろに高く昇る月です。</p>
${SEASONS.map(s => `<h2>${s}</h2><ul class="cards">${CONS.filter(C => C.season === s && !C.mw).map(C => `<li><a href="/seiza/${C.slug}/"><b>${C.short}</b><span>${C.star ? esc(C.star) : esc(C.note)}</span></a></li>`).join("")}</ul>`).join("")}
<h2>天の川</h2><ul class="cards"><li><a href="/seiza/milky-way/"><b>天の川</b><span>夏の濃い部分が見える時期と場所</span></a></li></ul></section>` + footer() + tail({}), { priority: 0.8, changefreq: "weekly" });

CONS.forEach(C => {
  const P = PLACES[TOKYO], months = core.monthRange(core.bestMonths(C, P)), fam = core.famousOf(C);
  const maxAlt = 90 - Math.abs(P.lat - C.de);
  const where = PLACES.filter(p => 90 - Math.abs(p.lat - C.de) > 2).map(p => p.p);
  const title = C.mw ? `天の川が見える時期・時間・場所｜${SITE.name}` : `${C.short}の見つけ方・見える時期と方角｜${SITE.name}`;
  const lead = maxAlt <= 2
    ? `${C.short}は、東京など本州の多くの場所からは地平線の上に昇らない南の星座です。${where.length ? `日本では${where.join("・")}などから、南の地平線すれすれに見えることがあります。` : "日本からは見ることができません。"}`
    : `${C.short}は${months ? `${months}ごろの夜9時に` : ""}見やすくなる${C.season.replace("の星座", "")}の${C.mw ? "星空" : "星座"}です。${C.star ? `目印は${esc(C.star)}。` : ""}${esc(C.note)}。`;
  const desc = `${lead}${fam.length ? `${fam.slice(0, 3).join("・")}などの有名な星の解説と、` : ""}星座の神話、今夜あなたの場所で見える時刻と方角が分かります。`.slice(0, 160);
  write(`/seiza/${C.slug}/`, head({
    title, desc, url: `/seiza/${C.slug}/`,
    jsonld: [crumbsLD([["88星座", "/seiza/"], [C.short, null]])]
  }) + topbar() + crumbs([["88星座", "/seiza/"], [C.short]]) + `
  <section class="intro top-intro"><h1>${C.mw ? "天の川が見える時期と場所" : `${C.short}の見つけ方`}</h1><p>${lead}</p></section>
` + appHTML({ pi: TOKYO, targetFirst: true, staticCard: staticCard(C) }) + footer() + tail({ target: C.n }), { priority: C.lv <= 2 ? 0.8 : 0.6, changefreq: "weekly" });
});

// イベント
const today = Date.UTC(...core.jstNow());
const allEv = core.eventsFrom(today).filter(e => e.t >= today - 30 * core.DAY).sort((a, b) => a.t - b.t);
write("/event/", head({
  title: `流星群カレンダー ${Y}–${Y + 1}｜見頃の日・時間・方角 - ${SITE.name}`,
  desc: "主な流星群の極大日と見頃の時間、月明かりの条件をまとめた流星群カレンダー。都道府県ごとの見頃の時間も分かります。",
  url: "/event/", jsonld: [crumbsLD([["流星群カレンダー", "/event/"]])]
}) + topbar() + crumbs([["流星群カレンダー"]]) + `<section class="intro"><h1>流星群カレンダー</h1><p>主な流星群の極大日（いちばん多く流れる日）と、その夜の月明かりの条件です。極大日は年によって1日ほど前後します。</p>
<ul class="cards">${allEv.filter(e => e.t >= today).map(e => { const x = new Date(e.t), f = core.illum(e.t + 16 * 3600e3).f; return `<li><a href="/event/${e.slug}/"><b>${x.getUTCFullYear()}/${x.getUTCMonth() + 1}/${x.getUTCDate()} ${e.n}</b><span>${e.rate}・月明かり${f < .3 ? "少なめ" : f < .65 ? "やや邪魔" : "強い"}</span></a></li>`; }).join("")}</ul></section>` + footer() + tail({}), { priority: 0.8, changefreq: "daily" });

allEv.forEach(e => {
  const x = new Date(e.t), date = `${x.getUTCFullYear()}年${x.getUTCMonth() + 1}月${x.getUTCDate()}日(${core.WD[x.getUTCDay()]})`;
  const dd = Math.round((e.t - today) / core.DAY), f = core.illum(e.t + 16 * 3600e3).f;
  const rows = PLACES.map((P, pi) => {
    const dayIdx = dd >= 0 && dd <= 8 ? dd : null;
    let txt = "—";
    if (dayIdx != null) { const { best, slots } = core.meteorWindowAt(e, pi, dayIdx, WEATHER); txt = best ? core.windowText(slots, best) : "条件が悪い"; }
    else {
      // 予報の範囲外：雲を考えずに暗さ・放射点・月だけで計算
      const dayStart = e.t - 9 * 3600e3 + 17 * 3600e3;
      const slots = Array.from({ length: 26 }, (_, i) => { const t = dayStart + i * 1800e3; const sa = core.sunAlt(t, P), mp = core.moonPos(t, P), il = core.illum(t).f, r = core.horiz(t, P.lat, P.lng, e.ra * 15 * core.R, e.de * core.R); const ml = mp.alt > 0 ? il * Math.min(1, (mp.alt + 5) / 30) : 0; return { t, v: sa < -18 && r.alt > 20 ? Math.sin(r.alt * core.R) * (1 - .6 * ml) : 0 }; });
      const ok = slots.filter(s => s.v > .15); txt = ok.length ? `${core.nx(ok[0].t)}${core.fmt(ok[0].t)}〜${core.nx(ok[ok.length - 1].t + 1800e3)}${core.fmt(ok[ok.length - 1].t + 1800e3)}` : "条件が悪い";
    }
    return `<tr><td><a href="/pref/${P.slug}/">${P.full}</a></td><td>${txt}</td></tr>`;
  }).join("");
  const C = CONS.find(c => c.n === e.c);
  write(`/event/${e.slug}/`, head({
    title: `${e.n} ${e.y}の見頃はいつ？時間・方角・月明かり｜${SITE.name}`,
    desc: `${e.n}の極大は${date}。${e.rate}。都道府県ごとの見頃の時間、流れ星が飛んでくる方向、月明かりの条件をまとめています。`,
    url: `/event/${e.slug}/`,
    jsonld: [crumbsLD([["流星群カレンダー", "/event/"], [`${e.n} ${e.y}`, null]])]
  }) + topbar() + crumbs([["流星群カレンダー", "/event/"], [`${e.n} ${e.y}`]]) + `
  <section class="intro top-intro"><h1>${e.n} ${e.y}の見頃</h1>
    <dl class="evfacts"><dt>極大</dt><dd>${date}の夜</dd><dt>流れる数</dt><dd>${e.rate}</dd><dt>放射点</dt><dd><a href="/seiza/${C ? C.slug : ""}/">${e.c}</a>の方向</dd><dt>月明かり</dt><dd>${f < .3 ? "少なめで好条件" : f < .65 ? "やや邪魔" : "強め"}（月の輝き${Math.round(f * 100)}%）</dd></dl>
    <p>${e.tip}${/空全体/.test(e.tip)?"":"流れ星は放射点を中心に四方へ飛ぶので、放射点だけを見つめるより、空を広く見渡すのがコツです。"}目が暗さに慣れるまで15分ほどかかるので、スマホの画面はできるだけ見ないようにしましょう。</p>
  </section>
` + appHTML({ pi: TOKYO }) + `
  <section class="intro">
    <h2>都道府県ごとの見頃の時間</h2>
    <p class="sub">${dd >= 0 && dd <= 8 ? "雲の予報を含めた" : "雲を考えず、空の暗さ・放射点の高さ・月明かりから計算した"}見頃の時間帯です（各県の代表地点）。</p>
    <div class="tablewrap"><table class="evtable"><thead><tr><th>都道府県</th><th>見頃の時間</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>
` + footer() + tail({ target: e.c, day: dd >= 0 && dd <= 3 ? dd : undefined }), { priority: 0.8, changefreq: "daily" });
});

// 運営者情報・プライバシー・お問い合わせ
function plain(url, title, h1, body) {
  write(url, head({ title: `${title}｜${SITE.name}`, desc: `${SITE.name}の${title}です。`, url }) + `  <header class="top"><a class="brand" href="/">${SITE.name}</a></header>` + crumbs([[title]]) + `<article class="doc"><h1>${h1}</h1>${body}</article>` + footer() + `</div>
<script>(function(){var c=document.getElementById("bg");if(!c)return;var x=c.getContext("2d");c.width=innerWidth;c.height=innerHeight;for(var i=0;i<150;i++){x.fillStyle="rgba(238,241,247,"+(.15+Math.random()*.5)+")";x.fillRect(Math.random()*c.width,Math.random()*c.height,1,1)}})();</script>
</body></html>`, { priority: 0.3, changefreq: "monthly" });
}
plain("/about/", "運営者情報", "運営者情報", `
<dl class="evfacts"><dt>サイト名</dt><dd>${SITE.name}</dd><dt>URL</dt><dd>${SITE.url}</dd><dt>運営</dt><dd>宇宙と謎のずんだ研究所</dd><dt>YouTube</dt><dd><a href="${SITE.youtube}" target="_blank" rel="noopener">宇宙と謎のずんだ研究所</a></dd><dt>X</dt><dd><a href="${SITE.x}" target="_blank" rel="noopener">@zundamon_space</a></dd><dt>お問い合わせ</dt><dd><a href="/contact/">お問い合わせページ</a></dd></dl>
<h2>このサイトについて</h2>
<p>${SITE.name}は、「今夜、星はいつ見えるのか」に答えるための星空情報サイトです。雲の予報、日の入り後の空の暗さ、月明かりを組み合わせて、星が見える時間帯を30分ごとに予報しています。あわせて、今夜見える星座の星図、88星座の見つけ方と神話、流星群の見頃の時間と方角を紹介しています。</p>
<h2>データについて</h2>
<p>雲の予報は、ノルウェー気象局（MET Norway）が公開している予報データ（CC BY 4.0）を加工して使っています。日の入り・薄明・月の満ち欠けと位置・星座の位置は、公開されている天文計算式をもとに当サイトで計算しています。予報は外れることがあり、また計算には数分程度の誤差があります。</p>`);

plain("/privacy/", "プライバシーポリシー", "プライバシーポリシー", `
<h2>広告について</h2>
<p>当サイトでは、第三者配信の広告サービス（Google アドセンス）を利用しています。広告配信事業者は、ユーザーの興味に応じた広告を表示するために Cookie（クッキー）を使用することがあります。Cookie を無効にする方法や Google アドセンスに関する詳細は、<a href="https://policies.google.com/technologies/ads?hl=ja" target="_blank" rel="noopener">広告 – ポリシーと規約 – Google</a> をご覧ください。</p>
<h2>アフィリエイトについて</h2>
<p>当サイトはアフィリエイト広告を利用しています。当サイトは Amazon.co.jp を宣伝しリンクすることによってサイトが紹介料を獲得できる手段を提供することを目的に設定されたアフィリエイトプログラムである、Amazon アソシエイト・プログラムの参加者です。</p>
<h2>アクセス解析について</h2>
<p>当サイトでは、サイトの改善のためにアクセス解析ツールを利用することがあります。解析ツールはトラフィックデータの収集のために Cookie 等を使用することがありますが、このデータは匿名で収集されており、個人を特定するものではありません。</p>
<h2>ブラウザへの保存について</h2>
<p>当サイトは、最後に選んだ場所や星座を次回も表示するため、お使いのブラウザ内（ローカルストレージ）に保存します。この情報が当サイトのサーバーに送られることはありません。</p>
<h2>免責事項</h2>
<p>当サイトの予報や計算結果は、正確さに努めていますが、内容を保証するものではありません。当サイトの情報を利用したことで生じた損害について、一切の責任を負いかねます。夜間に屋外へ出かける際は、足元や周囲の安全、私有地への立ち入りなどに十分ご注意ください。</p>
<h2>著作権について</h2>
<p>当サイトの文章や画像の無断転載を禁止します。雲の予報データは MET Norway（CC BY 4.0）によるものです。</p>
<p class="kv">制定日：${Y}年10月16日</p>`);

plain("/contact/", "お問い合わせ", "お問い合わせ", `
<p>${SITE.name}へのご意見・ご感想、情報の誤りのご指摘などは、X（旧Twitter）のダイレクトメッセージでお送りください。</p>
<p><a class="btnlink" href="${SITE.x}" target="_blank" rel="noopener">X（@zundamon_space）を開く</a></p>
<p class="kv">内容によってはお返事できない場合があります。あらかじめご了承ください。</p>`);

// 404
fs.writeFileSync(path.join(OUT, "404.html"), head({ title: `ページが見つかりません｜${SITE.name}`, desc: "ページが見つかりません。", url: "/404.html", noindex: true }) + `  <header class="top"><a class="brand" href="/">${SITE.name}</a></header><article class="doc"><h1>ページが見つかりません</h1><p>URLが変わったか、ページが削除された可能性があります。<a href="/">トップページ</a>から探してください。</p></article></div></body></html>`);

// サイトマップ・robots
const lastmod = BUILD_TIME.toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url><loc>${SITE.url}${p.url}</loc><lastmod>${lastmod}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority.toFixed(1)}</priority></url>`).join("\n")}
</urlset>
`);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

console.log(`built ${pages.length} pages -> dist/ (weather: ${WEATHER ? WEATHER.updated : "none"})`);
