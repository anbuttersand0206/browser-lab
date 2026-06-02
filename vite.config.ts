import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // './' にすることで GitHub Pages のサブパスデプロイに対応する。
  // BrowserRouter ではなく HashRouter を使う理由もここと連動している（静的ホスティングでの 404 回避）。
  base: './',

  server: {
    // 開発サーバーで COOP/COEP ヘッダーを直接付与し、crossOriginIsolated を有効にする。
    // 本番（GitHub Pages）では public/sw.js の Service Worker がこれを担う。
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  optimizeDeps: {
    // PGLite は Node.js 向けファイルシステム API を参照するモジュールを含むため、
    // Vite の事前バンドル対象から除外して変換エラーを防ぐ
    exclude: ['@electric-sql/pglite'],
  },

  build: {
    // PGLite が WebAssembly の top-level await を使うため esnext が必要
    target: 'esnext',

    rollupOptions: {
      output: {
        // 依存関係の大きいライブラリを分割して初期ロード時間を最適化する
        manualChunks: {
          codemirror: [
            'codemirror',
            '@codemirror/view',
            '@codemirror/state',
            '@codemirror/commands',
            '@codemirror/language',
          ],
          pglite: ['@electric-sql/pglite'],
        },
      },
    },
  },

  // public/ 内のファイル（sw.js, manifest.json, icons/ など）は
  // Vite が変換・バンドルせずそのまま dist/ にコピーする。
  // sw.js を import しないよう注意すること（importしたら通常のモジュールとして処理されてしまう）。
})
