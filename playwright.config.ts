// Playwright E2E テスト設定。
// ビルド済みの dist/ を vite preview で配信し、その URL に対してテストを実行する。
// WebContainers は COOP/COEP ヘッダーが必要だが、vite preview は vite.config.ts の
// server.headers 設定を読まないため、WebContainers を使うページのテストは除外する。

import { defineConfig, devices } from 'playwright/test'

export default defineConfig({
  testDir: './e2e',
  // 並列実行はブラウザ起動コストが高いため、CI では 2 並列に抑える
  workers: process.env.CI ? 2 : undefined,
  // 失敗時にスクリーンショットを保存して原因調査を助ける
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    // vite preview のデフォルトポート
    baseURL: 'http://localhost:4173',
    // CI での待機時間を短縮するため、アクションのデフォルトタイムアウトを 10 秒にする
    actionTimeout: 10_000,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  // テスト実行前に `npm run build && vite preview` を起動する
  webServer: {
    command: 'npm run build && npx vite preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
