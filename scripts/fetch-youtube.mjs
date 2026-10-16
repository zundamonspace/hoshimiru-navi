// チャンネルの最新の長い動画（ショートを除く）を site/data/youtube.json に保存する
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { SITE } = require(path.join(ROOT, "site/assets/core.js"));
const OUT = path.join(ROOT, "site/data/youtube.json");
const H = { "User-Agent": "Mozilla/5.0 (hoshimiru-navi)", "Accept-Language": "ja" };

const page = await (await fetch(SITE.youtube, { headers: H })).text();
const cid = (page.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/) || page.match(/channel\/(UC[\w-]{22})/) || [])[1];
if (!cid) { console.error("channel id not found"); process.exit(0); }
const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`, { headers: H })).text();
const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => ({
  id: (m[1].match(/<yt:videoId>([^<]+)/) || [])[1],
  title: ((m[1].match(/<title>([^<]+)/) || [])[1] || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
  published: (m[1].match(/<published>([^<]+)/) || [])[1]
})).filter(e => e.id);
let pick = null;
for (const e of entries) {
  // ショート動画は /shorts/ID がそのまま開ける（200）。長い動画は watch へ転送される
  const r = await fetch(`https://www.youtube.com/shorts/${e.id}`, { headers: H, redirect: "manual" });
  if (r.status !== 200) { pick = e; break; }
}
pick = pick || entries[0];
if (!pick) { console.error("no videos"); process.exit(0); }
const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { return null; } })();
console.log(`feed: ${entries.slice(0, 5).map(e => e.id + " " + e.title).join(" | ")}`);
if (prev && prev.id === pick.id && prev.title === pick.title) { console.log(`youtube: 変更なし (${pick.title})`); process.exit(0); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
// 動画が変わったときだけ書き換える（毎回書き換えるとサイトの作り直しが無駄に増えるため）
fs.writeFileSync(OUT, JSON.stringify({ id: pick.id, title: pick.title, published: pick.published, channelId: cid }));
console.log(`youtube: 更新 → ${pick.title}`);
