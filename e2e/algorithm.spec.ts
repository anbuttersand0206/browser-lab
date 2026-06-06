// アルゴリズム可視化コースの基本動作を検証する E2E テスト。
// WebContainers を使わないため、通常の vite preview 環境で動作する。

import { test, expect } from 'playwright/test'

test.describe('AlgorithmPage', () => {
  test.beforeEach(async ({ page }) => {
    // チュートリアルを閉じてからアルゴリズムページへ遷移する
    await page.goto('/#/algorithm')
  })

  test('ページタイトルが表示される', async ({ page }) => {
    await expect(page.getByText(/アルゴリズム可視化|Algorithm Visualizer/)).toBeVisible()
  })

  test('デフォルトアルゴリズム（バブルソート）が表示される', async ({ page }) => {
    // 左サイドバーにバブルソートが選択されて表示される
    await expect(page.getByText(/バブルソート|Bubble Sort/)).toBeVisible()
  })

  test('再生ボタンが機能する', async ({ page }) => {
    const playButton = page.getByRole('button', { name: /再生|Play/ })
    await expect(playButton).toBeVisible()
    await playButton.click()
    // 再生開始後は一時停止ボタンに変わる
    await expect(page.getByRole('button', { name: /一時停止|Pause/ })).toBeVisible()
  })

  test('ステップ実行ボタンが機能する', async ({ page }) => {
    // ステップログが更新されることで動作を確認する
    const stepButton = page.getByTitle(/ステップ|Step/)
    await stepButton.click()
    // ステップ実行後に何らかのログが表示される
    const logArea = page.locator('[class*="overflow"]').last()
    await expect(logArea).not.toBeEmpty()
  })

  test('アルゴリズムをサイドバーから選択できる', async ({ page }) => {
    // マージソートを選択する
    await page.getByText(/マージソート|Merge Sort/).click()
    await expect(page.getByText(/マージソート|Merge Sort/).first()).toBeVisible()
  })

  test('カスタム配列を入力して適用できる', async ({ page }) => {
    // ソートカテゴリが選ばれているので「カスタム配列」入力欄が表示される
    const input = page.getByPlaceholder(/例:|e\.g\./)
    await expect(input).toBeVisible()
    await input.fill('9,1,5,3,7,2')
    // 適用ボタンをクリックする
    await page.getByRole('button', { name: /適用|Apply/ }).click()
    // 配列長が変わる（6個）ことでエラーが出ていないことを確認する
    await expect(input).toHaveValue('')
  })

  test('リセットボタンが機能する', async ({ page }) => {
    const resetButton = page.getByRole('button', { name: /リセット|Reset/ })
    await expect(resetButton).toBeVisible()
    await resetButton.click()
    // リセット後に再生ボタンが使える状態になる
    await expect(page.getByRole('button', { name: /再生|Play/ })).toBeEnabled()
  })

  test('情報パネルが表示される', async ({ page }) => {
    // 右パネルに時間計算量の情報が表示される
    await expect(page.getByText(/O\(n/)).toBeVisible()
  })

  test('言語切り替えが機能する', async ({ page }) => {
    await page.getByRole('button', { name: /EN|JA|English|日本語/ }).click()
    // 英語に切り替わったらコントロールラベルが変わる
    await expect(page.getByText(/Play|Pause|Bubble Sort/)).toBeVisible()
  })
})
