# ほしみるナビ

https://hoshimiru-navi.com

今夜、星はいつ見える？を答える星空予報サイト。

- `site/assets/core.js` … 都道府県・88星座・流星群のデータと天文計算（ブラウザとビルドの両方で使う）
- `site/assets/app.js` … ページ上の動く部分（星図・時間帯グラフなど）
- `scripts/build.mjs` … `dist/` に全ページを書き出す（Cloudflare Pages のビルドコマンド）
- `scripts/fetch-weather.mjs` … MET Norway から雲の予報を取得（GitHub Actions で3時間ごと）
- `scripts/fetch-youtube.mjs` … YouTube の最新動画を取得

## Cloudflare Pages の設定
- ビルドコマンド：`node scripts/build.mjs`
- 出力ディレクトリ：`dist`

## 収益の設定
`site/assets/core.js` の `SITE` にある `amazonTag` と `adsenseClient` に値を入れると、商品リンクと広告が有効になります。
