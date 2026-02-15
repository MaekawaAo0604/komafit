import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

/**
 * Task 9.4: 統合テストの実施
 *
 * パターン登録から展開、例外処理、削除までの完全なフローをテスト
 */

test.describe('定期授業パターンシステム 統合テスト', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await loginAsTestUser(page)

    // 月次カレンダーページに移動
    await page.goto('/monthly-calendar')

    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle')
  })

  test('完全な定期授業パターンライフサイクル', async ({ page }) => {
    /**
     * シナリオ:
     * 1. パターン表示をON
     * 2. 新規パターンを登録
     * 3. カレンダーに展開されることを確認
     * 4. 特定の日を休みに設定
     * 5. 休みを解除
     * 6. パターンを編集
     * 7. パターンを削除
     */

    // 1. パターン表示をON
    await page.click('[data-testid="toggle-patterns"]')
    await expect(page.locator('[data-testid="pattern-list"]')).toBeVisible()

    // 2. 新規パターンを登録
    await page.click('[data-testid="add-pattern-button"]')

    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-1"]')

    await page.click('[data-testid="student-select"]')
    await page.click('[data-testid="student-option-1"]')

    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-math"]')

    await page.click('[data-testid="day-of-week-select"]')
    await page.click('[data-testid="day-option-wednesday"]')

    await page.click('[data-testid="slot-select"]')
    await page.click('[data-testid="slot-option-A"]')

    await page.fill('[data-testid="start-date-input"]', '2024-04-01')
    await page.fill('[data-testid="end-date-input"]', '2024-04-30')

    await page.click('[data-testid="priority-select"]')
    await page.click('[data-testid="priority-option-high"]')

    await page.click('[data-testid="submit-pattern-button"]')

    // 成功メッセージを待つ
    await expect(page.locator('text=パターンを登録しました')).toBeVisible()

    // パターンリストに表示されることを確認
    await expect(
      page.locator('[data-testid="pattern-list"] >> text=毎週水曜日 コマA')
    ).toBeVisible()

    // 3. カレンダーに展開されることを確認
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    // 4月の水曜日にパターンが表示されることを確認
    const april3Cell = page.locator('[data-testid="calendar-cell-2024-04-03"]')
    await expect(april3Cell.locator('[data-source="pattern"]')).toBeVisible()

    const april10Cell = page.locator('[data-testid="calendar-cell-2024-04-10"]')
    await expect(april10Cell.locator('[data-source="pattern"]')).toBeVisible()

    // 4. 特定の日（4月10日）を休みに設定
    await april10Cell.click({ button: 'right' })
    await page.click('[data-testid="context-menu-cancel"]')

    // 休みになったことを確認
    await expect(
      page.locator('text=この日を休みとして登録しました')
    ).toBeVisible()

    await expect(april10Cell.locator('[data-source="exception"]')).toBeVisible()
    await expect(april10Cell.locator('[data-testid="cancelled-badge"]')).toBeVisible()

    // 5. 休みを解除
    await april10Cell.click({ button: 'right' })
    await page.click('[data-testid="context-menu-restore"]')

    // 元に戻ったことを確認
    await expect(page.locator('text=例外処理を解除しました')).toBeVisible()

    await page.reload()

    await expect(april10Cell.locator('[data-source="pattern"]')).toBeVisible()

    // 6. パターンを編集
    const patternItem = page.locator('[data-testid="pattern-list-item"]').first()
    await patternItem.locator('[data-testid="edit-pattern-button"]').click()

    // 科目を英語に変更
    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-english"]')

    await page.click('[data-testid="submit-pattern-button"]')

    // 成功メッセージを待つ
    await expect(page.locator('text=パターンを更新しました')).toBeVisible()

    // カレンダーで変更が反映されることを確認
    await page.reload()

    await expect(april3Cell).toContainText('英語')
    await expect(april3Cell).not.toContainText('数学')

    // 7. パターンを削除
    await patternItem.locator('[data-testid="delete-pattern-button"]').click()

    // 確認ダイアログがある場合
    const confirmButton = page.locator('[data-testid="confirm-delete-button"]')
    if ((await confirmButton.count()) > 0) {
      await confirmButton.click()
    }

    // 成功メッセージを待つ
    await expect(page.locator('text=パターンを削除しました')).toBeVisible()

    // パターンリストから消えることを確認
    await expect(patternItem).not.toBeVisible()

    // カレンダーから消えることを確認
    await page.reload()

    await expect(april3Cell.locator('[data-source="pattern"]')).not.toBeVisible()
  })

  test('複数パターンと例外の複雑なシナリオ', async ({ page }) => {
    /**
     * シナリオ:
     * 1. 2つのパターンを登録（異なる曜日）
     * 2. 片方のパターンの一部の日を休みに設定
     * 3. フィルタで各データソースを切り替え
     * 4. 両方のパターンを削除
     */

    await page.click('[data-testid="toggle-patterns"]')

    // 1. 月曜日のパターンを登録
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

    await expect(page.locator('text=パターンを登録しました')).toBeVisible()

    // 2. 水曜日のパターンを登録
    await page.click('[data-testid="add-pattern-button"]')

    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-2"]')

    await page.click('[data-testid="student-select"]')
    await page.click('[data-testid="student-option-2"]')

    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-english"]')

    await page.click('[data-testid="day-of-week-select"]')
    await page.click('[data-testid="day-option-wednesday"]')

    await page.click('[data-testid="slot-select"]')
    await page.click('[data-testid="slot-option-B"]')

    await page.fill('[data-testid="start-date-input"]', '2024-04-01')
    await page.fill('[data-testid="end-date-input"]', '2024-04-30')

    await page.click('[data-testid="submit-pattern-button"]')

    await expect(page.locator('text=パターンを登録しました')).toBeVisible()

    // パターンリストに2件表示されることを確認
    const patternItems = page.locator('[data-testid="pattern-list-item"]')
    expect(await patternItems.count()).toBe(2)

    // 3. カレンダーで確認
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    // 月曜日（4月1日）にパターンが表示される
    const april1Cell = page.locator('[data-testid="calendar-cell-2024-04-01"]')
    await expect(april1Cell.locator('[data-source="pattern"]')).toBeVisible()

    // 水曜日（4月3日）にパターンが表示される
    const april3Cell = page.locator('[data-testid="calendar-cell-2024-04-03"]')
    await expect(april3Cell.locator('[data-source="pattern"]')).toBeVisible()

    // 4. 月曜日の一部を休みに設定（4月8日）
    const april8Cell = page.locator('[data-testid="calendar-cell-2024-04-08"]')
    await april8Cell.click({ button: 'right' })
    await page.click('[data-testid="context-menu-cancel"]')

    await expect(april8Cell.locator('[data-source="exception"]')).toBeVisible()

    // 5. フィルタで各データソースを切り替え
    const filter = page.locator('[data-testid="data-source-filter"]')

    // パターンのみ表示
    await filter.selectOption('pattern')

    // パターンセルが表示される
    await expect(april1Cell.locator('[data-source="pattern"]')).toBeVisible()

    // 例外セルは表示されない（フィルタリングされる）
    const exceptionCells = page.locator('[data-source="exception"]')
    if ((await exceptionCells.count()) > 0) {
      await expect(exceptionCells.first()).not.toBeVisible()
    }

    // 例外のみ表示
    await filter.selectOption('exception')

    // 例外セルが表示される
    await expect(april8Cell.locator('[data-source="exception"]')).toBeVisible()

    // パターンセルは表示されない（フィルタリングされる）
    const patternCells = page.locator('[data-source="pattern"]')
    if ((await patternCells.count()) > 0) {
      await expect(patternCells.first()).not.toBeVisible()
    }

    // すべて表示に戻す
    await filter.selectOption('all')

    // 両方表示される
    await expect(april1Cell.locator('[data-source="pattern"]')).toBeVisible()
    await expect(april8Cell.locator('[data-source="exception"]')).toBeVisible()

    // 6. すべてのパターンを削除
    const firstPattern = patternItems.first()
    await firstPattern.locator('[data-testid="delete-pattern-button"]').click()

    const confirmButton = page.locator('[data-testid="confirm-delete-button"]')
    if ((await confirmButton.count()) > 0) {
      await confirmButton.click()
    }

    await expect(page.locator('text=パターンを削除しました')).toBeVisible()

    const secondPattern = patternItems.first()
    await secondPattern.locator('[data-testid="delete-pattern-button"]').click()

    if ((await confirmButton.count()) > 0) {
      await confirmButton.click()
    }

    await expect(page.locator('text=パターンを削除しました')).toBeVisible()

    // パターンリストが空になることを確認
    expect(await patternItems.count()).toBe(0)

    // カレンダーからパターンが消えることを確認
    await page.reload()

    const remainingPatterns = page.locator('[data-source="pattern"]')
    expect(await remainingPatterns.count()).toBe(0)
  })

  test('パターン表示のON/OFF切り替え', async ({ page }) => {
    /**
     * シナリオ:
     * 1. パターン表示をON
     * 2. パターンを登録
     * 3. パターン表示をOFF
     * 4. パターン表示を再度ON
     */

    // 1. パターン表示をON
    await page.click('[data-testid="toggle-patterns"]')
    await expect(page.locator('[data-testid="pattern-list"]')).toBeVisible()

    // 2. パターンを登録
    await page.click('[data-testid="add-pattern-button"]')

    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-1"]')

    await page.click('[data-testid="student-select"]')
    await page.click('[data-testid="student-option-1"]')

    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-math"]')

    await page.click('[data-testid="day-of-week-select"]')
    await page.click('[data-testid="day-option-friday"]')

    await page.click('[data-testid="slot-select"]')
    await page.click('[data-testid="slot-option-A"]')

    await page.fill('[data-testid="start-date-input"]', '2024-04-01')
    await page.fill('[data-testid="end-date-input"]', '2024-04-30')

    await page.click('[data-testid="submit-pattern-button"]')

    await expect(page.locator('text=パターンを登録しました')).toBeVisible()

    // カレンダーでパターンが表示されることを確認
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    const april5Cell = page.locator('[data-testid="calendar-cell-2024-04-05"]')
    await expect(april5Cell.locator('[data-source="pattern"]')).toBeVisible()

    // 3. パターン表示をOFF
    await page.click('[data-testid="toggle-patterns"]')

    // パターンリストが非表示になることを確認
    await expect(page.locator('[data-testid="pattern-list"]')).not.toBeVisible()

    // フィルタも非表示になることを確認
    await expect(
      page.locator('[data-testid="data-source-filter"]')
    ).not.toBeVisible()

    // カレンダーからパターンが消えることを確認（通常割当のみ表示）
    await page.reload()

    const patternCells = page.locator('[data-source="pattern"]')
    expect(await patternCells.count()).toBe(0)

    // 4. パターン表示を再度ON
    await page.click('[data-testid="toggle-patterns"]')

    // パターンリストが表示されることを確認
    await expect(page.locator('[data-testid="pattern-list"]')).toBeVisible()

    // カレンダーにパターンが再表示されることを確認
    await page.reload()

    await expect(april5Cell.locator('[data-source="pattern"]')).toBeVisible()
  })

  test('エラーハンドリングと回復', async ({ page }) => {
    /**
     * シナリオ:
     * 1. ネットワークエラーをシミュレート
     * 2. エラーメッセージが表示されることを確認
     * 3. リトライで成功することを確認
     */

    await page.click('[data-testid="toggle-patterns"]')

    // ネットワークを一時的にオフライン化
    await page.context().setOffline(true)

    // パターンを登録しようとする
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

    // エラーメッセージが表示されることを確認
    await expect(
      page.locator('text=ネットワークエラーが発生しました')
    ).toBeVisible()

    // モーダルは開いたままであることを確認
    await expect(page.locator('[data-testid="pattern-modal"]')).toBeVisible()

    // ネットワークを復旧
    await page.context().setOffline(false)

    // リトライボタンをクリック（またはもう一度送信ボタンをクリック）
    await page.click('[data-testid="submit-pattern-button"]')

    // 成功メッセージが表示されることを確認
    await expect(page.locator('text=パターンを登録しました')).toBeVisible()

    // モーダルが閉じることを確認
    await expect(page.locator('[data-testid="pattern-modal"]')).not.toBeVisible()
  })
})
