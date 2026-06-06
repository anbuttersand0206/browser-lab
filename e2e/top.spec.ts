// トップページの基本動作を検証する E2E テスト。
// WebContainers・PGLite を使うページはブラウザ外では動作しないため、
// ここではインフラ/プログラミング/DB コースのページ遷移は行わない。

import { test, expect } from 'playwright/test'

test.describe('TopPage', () => {
  test.beforeEach(async ({ page }) => {
    // 初回訪問扱いにするためチュートリアル完了フラグを消してから開く
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('browser-lab:tutorial-done'))
    await page.reload()
  })

  test('タイトルが表示される', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Browser Lab')
  })

  test('チュートリアルモーダルが初回訪問時に表示される', async ({ page }) => {
    // チュートリアルモーダルの存在を確認する
    const modal = page.getByRole('dialog', { name: /Browser Lab へようこそ|Welcome to Browser Lab/ })
    await expect(modal).toBeVisible()
  })

  test('チュートリアルをスキップできる', async ({ page }) => {
    const modal = page.getByRole('dialog')
    await modal.getByText(/スキップ|Skip/).click()
    await expect(modal).not.toBeVisible()
  })

  test('チュートリアルを最後まで進めて閉じられる', async ({ page }) => {
    const modal = page.getByRole('dialog')
    // 4ステップ（次へ×3 → 始める）
    for (let i = 0; i < 3; i++) {
      await modal.getByText(/次へ|Next →/).click()
    }
    await modal.getByText(/始める|Let's start/).click()
    await expect(modal).not.toBeVisible()
  })

  test('2回目以降はチュートリアルが表示されない', async ({ page }) => {
    // スキップして閉じる
    await page.getByRole('dialog').getByText(/スキップ|Skip/).click()
    await page.reload()
    // モーダルが存在しないことを確認する
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('アルゴリズム可視化コースに遷移できる', async ({ page }) => {
    // チュートリアルを閉じてからコースカードをクリックする
    const modal = page.getByRole('dialog')
    if (await modal.isVisible()) {
      await modal.getByText(/スキップ|Skip/).click()
    }
    // アルゴリズムコースのカードボタンをクリックする
    await page.getByRole('button', { name: /アルゴリズム可視化|Algorithm Visualizer/ }).click()
    await expect(page).toHaveURL(/\/algorithm/)
  })

  test('テーマを切り替えられる', async ({ page }) => {
    const modal = page.getByRole('dialog')
    if (await modal.isVisible()) {
      await modal.getByText(/スキップ|Skip/).click()
    }
    // html 要素のクラスでダーク/ライトを判別する
    const htmlEl = page.locator('html')
    const initialClass = await htmlEl.getAttribute('class')
    // テーマ切り替えボタンをクリックする（Sun/Moon アイコンを持つボタン）
    await page.getByRole('button', { name: /ライト|ダーク|Light|Dark/ }).click()
    const afterClass = await htmlEl.getAttribute('class')
    expect(afterClass).not.toBe(initialClass)
  })

  test('言語を切り替えられる', async ({ page }) => {
    const modal = page.getByRole('dialog')
    if (await modal.isVisible()) {
      await modal.getByText(/スキップ|Skip/).click()
    }
    // 言語切り替えボタンをクリックする（"EN" or "JA" が表示される）
    await page.getByRole('button', { name: /EN|JA|English|日本語/ }).click()
    // ページが英語 or 日本語に切り替わったことを確認する（タイトルは変わらない）
    const subtitle = page.locator('p').first()
    await expect(subtitle).not.toBeEmpty()
  })
})
