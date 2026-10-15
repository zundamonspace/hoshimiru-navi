// 47都道府県の雲量予報を MET Norway から取得して site/data/weather.json に保存する
// 利用規約: https://api.met.no/doc/TermsOfService （User-Agentでサイト名と連絡先を名乗る・データの出典を表示する）
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { PLACES, SITE } = require(path.join(ROOT, "site/assets/core.js"));
const OUT = path.join(ROOT, "site/data/weather.json");
const UA = `hoshimiru-navi/1.0 ${SITE.url} ${SITE.url}/contact/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, "utf8")); } catch { return null; } })();
const places = [];
let ok = 0;
for (const [i, P] of PLACES.entries()) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${P.lat.toFixed(2)}&lon=${P.lng.toFixed(2)}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const now = Date.now() / 1000 - 3600, limit = now + 6 * 86400;
    const arr = j.properties.timeseries
      .map(s => [Math.round(Date.parse(s.time) / 1000), Math.round(s.data.instant.details.cloud_area_fraction)])
      .filter(([t, c]) => t >= now && t <= limit && Number.isFinite(c));
    places.push(arr); ok++;
  } catch (e) {
    console.error(`${P.p}: ${e.message}`);
    places.push(prev?.places?.[i] || []);
  }
  await sleep(300);
}
if (!ok) { console.error("取得に全て失敗しました。前回のデータを残します。"); process.exit(0); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), source: "MET Norway Locationforecast 2.0 (CC BY 4.0)", places }));
console.log(`weather: ${ok}/${PLACES.length} places`);
