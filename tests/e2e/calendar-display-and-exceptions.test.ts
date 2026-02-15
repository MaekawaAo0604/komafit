import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

/**
 * Task 9.2: カレンダー表示・例外処理のE2Eテスト
 *
 * パターンのカレンダー展開、色分け表示、例外処理（休み・振替）をテスト
 */

test.describe('カレンダー表示と例外処理', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await loginAsTestUser(page)

    // 月次カレンダーページに移動
    await page.goto('/monthly-calendar')

    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle')

    // 「パターン表示」トグルをONにする
    await page.click('[data-testid="toggle-patterns"]')
  })

  test('パターンがカレンダーに正しく展開される', async ({ page }) => {
    // パターンを登録
    await page.click('[data-testid="add-pattern-button"]')

    // フォームに入力（毎週月曜日のパターン）
    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-1"]')

    await page.click('[data-testid="student-select"]')
    await page.click('[data-testid="student-option-1"]')

    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-math"]')

    await page.click('[data-testid="day-of-week-select"]')
    await page.click('[data-testid="day-option-monday"]')

    await page.click('[data-testid="slot-select"]')
    await page.click('[data-testid="slot-option-A"]')

    await page.fill('[data-testid="start-date-input"]', '2024-04-01')
    await page.fill('[data-testid="end-date-input"]', '2024-04-30')

    await page.click('[data-testid="submit-pattern-button"]')

    // 成功メッセージを待つ
    await expect(page.locator('text=パターンを登録しました')).toBeVisible()

    // 2024年4月のカレンダーに切り替え
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    // 4月の月曜日（1, 8, 15, 22, 29日）にパターンが表示されることを確認
    const mondayDates = [1, 8, 15, 22, 29]

    for (const date of mondayDates) {
      const cell = page.locator(`[data-testid="calendar-cell-2024-04-${String(date).padStart(2, '0')}"]`)
      await expect(cell).toBeVisible()

      // パターンバッジが表示されることを確認
      await expect(cell.locator('[data-testid="pattern-badge"]')).toBeVisible()

      // 青色の背景（パターン表示）
      const bgColor = await cell.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      )
      // rgb(219, 234, 254) = #DBEAFE（青）
      expect(bgColor).toContain('219, 234, 254')
    }
  })

  test('パターンが色分けで表示される', async ({ page }) => {
    // パターンセル（pattern）は青色
    const patternCell = page.locator('[data-source="pattern"]').first()
    if ((await patternCell.count()) > 0) {
      const bgColor = await patternCell.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      )
      expect(bgColor).toContain('219, 234, 254') // #DBEAFE
    }

    // 通常割当セル（assignment）は緑色
    const assignmentCell = page.locator('[data-source="assignment"]').first()
    if ((await assignmentCell.count()) > 0) {
      const bgColor = await assignmentCell.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      )
      expect(bgColor).toContain('209, 250, 229') // #D1FAE5
    }

    // 例外セル（exception）はグレー
    const exceptionCell = page.locator('[data-source="exception"]').first()
    if ((await exceptionCell.count()) > 0) {
      const bgColor = await exceptionCell.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      )
      expect(bgColor).toContain('243, 244, 246') // #F3F4F6
    }
  })

  test('右クリックメニューから「この日だけ休み」を設定できる', async ({ page }) => {
    // パターンが存在するセルを右クリック
    const patternCell = page.locator('[data-source="pattern"]').first()
    await patternCell.click({ button: 'right' })

    // コンテキストメニューが表示されることを確認
    await expect(page.locator('[data-testid="context-menu"]')).toBeVisible()

    // 「この日だけ休み」メニュー項目をクリック
    await page.click('[data-testid="context-menu-cancel"]')

    // 成功メッセージが表示されることを確認
    await expect(
      page.locator('text=この日を休みとして登録しました')
    ).toBeVisible()

    // セルがグレーになることを確認（例外表示）
    const bgColor = await patternCell.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    )
    expect(bgColor).toContain('243, 244, 246') // #F3F4F6（グレー）

    // キャンセルバッジが表示されることを確認
    await expect(patternCell.locator('[data-testid="cancelled-badge"]')).toBeVisible()
  })

  test('休み設定した日を元に戻すことができる', async ({ page }) => {
    // まず休みを設定
    const patternCell = page.locator('[data-source="pattern"]').first()
    await patternCell.click({ button: 'right' })
    await page.click('[data-testid="context-menu-cancel"]')

    // 成功メッセージを待つ
    await expect(
      page.locator('text=この日を休みとして登録しました')
    ).toBeVisible()

    // もう一度右クリック
    await patternCell.click({ button: 'right' })

    // 「元に戻す」メニュー項目が表示されることを確認
    await expect(page.locator('[data-testid="context-menu-restore"]')).toBeVisible()

    // 「元に戻す」をクリック
    await page.click('[data-testid="context-menu-restore"]')

    // 成功メッセージが表示されることを確認
    await expect(page.locator('text=例外処理を解除しました')).toBeVisible()

    // セルが青色に戻ることを確認（パターン表示）
    const bgColor = await patternCell.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    )
    expect(bgColor).toContain('219, 234, 254') // #DBEAFE（青）
  })

  test('ツールチップでパターン詳細が表示される', async ({ page }) => {
    // パターンセルにホバー
    const patternCell = page.locator('[data-source="pattern"]').first()
    await patternCell.hover()

    // ツールチップが表示されることを確認
    await expect(page.locator('[data-testid="cell-tooltip"]')).toBeVisible()

    // ツールチップに講師名、生徒名、科目が含まれることを確認
    const tooltip = page.locator('[data-testid="cell-tooltip"]')
    await expect(tooltip).toContainText('講師:')
    await expect(tooltip).toContainText('生徒:')
    await expect(tooltip).toContainText('科目:')
  })

  test('フィルタで表示を切り替えることができる', async ({ page }) => {
    // データソースフィルタが表示されていることを確認
    await expect(page.locator('[data-testid="data-source-filter"]')).toBeVisible()

    // 初期状態は「すべて」
    const filter = page.locator('[data-testid="data-source-filter"]')
    await expect(filter).toHaveValue('all')

    // パターンのみを表示
    await filter.selectOption('pattern')

    // パターンセルのみが表示されることを確認
    await expect(page.locator('[data-source="pattern"]').first()).toBeVisible()

    // 通常割当セルが表示されないことを確認（存在する場合）
    const assignmentCells = page.locator('[data-source="assignment"]')
    if ((await assignmentCells.count()) > 0) {
      await expect(assignmentCells.first()).not.toBeVisible()
    }

    // 例外のみを表示
    await filter.selectOption('exception')

    // 例外セルのみが表示されることを確認（存在する場合）
    const exceptionCells = page.locator('[data-source="exception"]')
    if ((await exceptionCells.count()) > 0) {
      await expect(exceptionCells.first()).toBeVisible()
    }

    // パターンセルが表示されないことを確認
    const patternCells = page.locator('[data-source="pattern"]')
    if ((await patternCells.count()) > 0) {
      await expect(patternCells.first()).not.toBeVisible()
    }

    // 「すべて」に戻す
    await filter.selectOption('all')

    // すべてのセルが表示されることを確認
    if ((await patternCells.count()) > 0) {
      await expect(patternCells.first()).toBeVisible()
    }
  })

  test('異なる月にパターンが展開されない', async ({ page }) => {
    // パターンを登録（4月のみ）
    await page.click('[data-testid="add-pattern-button"]')

    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-1"]')

    await page.click('[data-testid="student-select"]')
    await page.click('[data-testid="student-option-1"]')

    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-math"]')

    await page.click('[data-testid="day-of-week-select"]')
    await page.click('[data-testid="day-option-monday"]')

    await page.click('[data-testid="slot-select"]')
    await page.click('[data-testid="slot-option-A"]')

    await page.fill('[data-testid="start-date-input"]', '2024-04-01')
    await page.fill('[data-testid="end-date-input"]', '2024-04-30')

    await page.click('[data-testid="submit-pattern-button"]')

    // 2024年4月のカレンダーでパターンが表示されることを確認
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    const aprilPatternCells = page.locator('[data-source="pattern"]')
    expect(await aprilPatternCells.count()).toBeGreaterThan(0)

    // 2024年5月のカレンダーに切り替え
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-05"]')

    // 5月にはパターンが表示されないことを確認
    const mayPatternCells = page.locator('[data-source="pattern"]')
    expect(await mayPatternCells.count()).toBe(0)
  })

  test('複数のパターンが同じ日に表示される場合の優先順位', async ({ page }) => {
    // 高優先度パターンを登録
    await page.click('[data-testid="add-pattern-button"]')

    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-1"]')

    await page.click('[data-testid="student-select"]')
    await page.click('[data-testid="student-option-1"]')

    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-math"]')

    await page.click('[data-testid="day-of-week-select"]')
    await page.click('[data-testid="day-option-monday"]')

    await page.click('[data-testid="slot-select"]')
    await page.click('[data-testid="slot-option-A"]')

    await page.fill('[data-testid="start-date-input"]', '2024-04-01')
    await page.fill('[data-testid="end-date-input"]', '2024-04-30')

    await page.click('[data-testid="priority-select"]')
    await page.click('[data-testid="priority-option-high"]')

    await page.click('[data-testid="submit-pattern-button"]')

    // 低優先度パターンを登録（同じ曜日、同じコマ）
    await page.click('[data-testid="add-pattern-button"]')

    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-2"]')

    await page.click('[data-testid="student-select"]')
    await page.click('[data-testid="student-option-2"]')

    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-english"]')

    await page.click('[data-testid="day-of-week-select"]')
    await page.click('[data-testid="day-option-monday"]')

    await page.click('[data-testid="slot-select"]')
    await page.click('[data-testid="slot-option-A"]')

    await page.fill('[data-testid="start-date-input"]', '2024-04-01')
    await page.fill('[data-testid="end-date-input"]', '2024-04-30')

    await page.click('[data-testid="priority-select"]')
    await page.click('[data-testid="priority-option-low"]')

    await page.click('[data-testid="submit-pattern-button"]')

    // カレンダーで高優先度のパターンが表示されることを確認
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    const mondayCell = page.locator('[data-testid="calendar-cell-2024-04-01"]')

    // 数学のパターンが表示されることを確認（高優先度）
    await expect(mondayCell).toContainText('数学')

    // 英語のパターンは表示されないことを確認（低優先度で上書きされている）
    await expect(mondayCell).not.toContainText('英語')
  })
})
