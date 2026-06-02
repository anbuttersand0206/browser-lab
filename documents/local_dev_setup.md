# ローカル開発環境のセットアップ（Mac）

## 前提条件

| ツール | 推奨バージョン | 確認コマンド |
|---|---|---|
| Node.js | 22 LTS | `node -v` |
| npm | 10 以上（Node 22 に同梱） | `npm -v` |

Node.js は [https://nodejs.org](https://nodejs.org) の LTS 版をインストールするか、`nvm` を使う。

```bash
# nvm を使う場合
nvm install 22
nvm use 22
```

---

## セットアップ手順

```bash
# 1. リポジトリをクローン
git clone <リポジトリURL>
cd browser-lab

# 2. 依存パッケージをインストール
npm install

# 3. 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173` を開くと動作する。

---

## 環境変数（任意）

WebContainer API キーはローカルの `localhost` では不要。カスタムドメインで動かす場合のみ必要。

```bash
# .env.local.example をコピーして編集
cp .env.local.example .env.local
```

`.env.local` の内容：

```
VITE_WEBCONTAINER_API_KEY=your_api_key_here
```

`.env.local` はコミット禁止（`.gitignore` で除外済み）。

---

## 主なコマンド

```bash
npm run dev      # 開発サーバー起動（ホットリロードあり）
npm run build    # プロダクションビルド → dist/ に出力
npm run preview  # ビルド済み dist/ をローカルで確認
npm run lint     # ESLint によるコード検査
```

---

## 開発サーバーの特記事項

### COOP / COEP ヘッダー

WebContainer と PGLite（WASM）は `crossOriginIsolated` が必要。  
`vite.config.ts` の `server.headers` で自動付与しているため、追加設定は不要。

本番（GitHub Pages）では `public/sw.js` の Service Worker が同じヘッダーを担う。

### PGLite の Vite 除外設定

`@electric-sql/pglite` は Vite の事前バンドル対象から除外している（`optimizeDeps.exclude`）。  
初回ロード時に変換エラーが出る場合はキャッシュをクリアする。

```bash
rm -rf node_modules/.vite
npm run dev
```

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `SharedArrayBuffer is not defined` | ブラウザが `crossOriginIsolated` でない。開発サーバー経由でアクセスしているか確認 |
| WebContainer が起動しない | Chrome / Edge を使う（Firefox は WebContainer 非対応） |
| `npm install` でエラー | Node.js のバージョンを確認（`node -v`）。22 LTS 推奨 |
| PGLite の読み込みが遅い | 初回は WASM のダウンロードが発生するため正常。2 回目以降はキャッシュが効く |
