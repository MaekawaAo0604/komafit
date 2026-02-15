import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

/**
 * Task 9.3: 優先順位・データ整合性テスト
 *
 * パターンと通常割当の優先順位、データ整合性、エッジケースをテスト
 */

test.describe('優先順位とデータ整合性', () => {
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

  test('通常割当がパターンより優先される', async ({ page }) => {
    // パターンを登録
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

    // カレンダーに移動
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    // 4月1日のセル（月曜日）を確認
    const mondayCell = page.locator('[data-testid="calendar-cell-2024-04-01"]')

    // パターンが表示されていることを確認
    await expect(mondayCell.locator('[data-source="pattern"]')).toBeVisible()

    // 通常割当を作成（同じ日、同じコマ）
    // NOTE: この部分は実際のUIフローに合わせて調整が必要
    await page.click('[data-testid="create-assignment-button"]')

    await page.click('[data-testid="assignment-teacher-select"]')
    await page.click('[data-testid="assignment-teacher-option-2"]')

    await page.click('[data-testid="assignment-student-select"]')
    await page.click('[data-testid="assignment-student-option-2"]')

    await page.click('[data-testid="assignment-subject-select"]')
    await page.click('[data-testid="assignment-subject-option-english"]')

    await page.fill('[data-testid="assignment-date-input"]', '2024-04-01')

    await page.click('[data-testid="assignment-slot-select"]')
    await page.click('[data-testid="assignment-slot-option-A"]')

    await page.click('[data-testid="submit-assignment-button"]')

    // カレンダーをリフレッシュ
    await page.reload()

    // 4月1日のセルに通常割当が表示されることを確認
    await expect(mondayCell.locator('[data-source="assignment"]')).toBeVisible()

    // パターンではなく通常割当が表示されることを確認
    await expect(mondayCell).toContainText('英語')
    await expect(mondayCell).not.toContainText('数学')
  })

  test('例外処理（休み）がパターンより優先される', async ({ page }) => {
    // パターンセルを右クリックして休みに設定
    const patternCell = page.locator('[data-source="pattern"]').first()
    await patternCell.click({ button: 'right' })

    await page.click('[data-testid="context-menu-cancel"]')

    // 休み設定後、そのセルが例外として表示されることを確認
    await expect(patternCell.locator('[data-source="exception"]')).toBeVisible()

    // パターンバッジが表示されないことを確認
    await expect(
      patternCell.locator('[data-testid="pattern-badge"]')
    ).not.toBeVisible()

    // キャンセルバッジが表示されることを確認
    await expect(
      patternCell.locator('[data-testid="cancelled-badge"]')
    ).toBeVisible()
  })

  test('高優先度パターンが低優先度パターンより優先される', async ({ page }) => {
    // 低優先度パターンを登録
    await page.click('[data-testid="add-pattern-button"]')

    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-1"]')

    await page.click('[data-testid="student-select"]')
    await page.click('[data-testid="student-option-1"]')

    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-math"]')

    await page.click('[data-testid="day-of-week-select"]')
    await page.click('[data-testid="day-option-tuesday"]')

    await page.click('[data-testid="slot-select"]')
    await page.click('[data-testid="slot-option-A"]')

    await page.fill('[data-testid="start-date-input"]', '2024-04-01')
    await page.fill('[data-testid="end-date-input"]', '2024-04-30')

    await page.click('[data-testid="priority-select"]')
    await page.click('[data-testid="priority-option-low"]')

    await page.click('[data-testid="submit-pattern-button"]')

    // 高優先度パターンを登録（同じ条件）
    await page.click('[data-testid="add-pattern-button"]')

    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-2"]')

    await page.click('[data-testid="student-select"]')
    await page.click('[data-testid="student-option-2"]')

    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-english"]')

    await page.click('[data-testid="day-of-week-select"]')
    await page.click('[data-testid="day-option-tuesday"]')

    await page.click('[data-testid="slot-select"]')
    await page.click('[data-testid="slot-option-A"]')

    await page.fill('[data-testid="start-date-input"]', '2024-04-01')
    await page.fill('[data-testid="end-date-input"]', '2024-04-30')

    await page.click('[data-testid="priority-select"]')
    await page.click('[data-testid="priority-option-high"]')

    await page.click('[data-testid="submit-pattern-button"]')

    // カレンダーで確認
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    const tuesdayCell = page.locator('[data-testid="calendar-cell-2024-04-02"]')

    // 高優先度の英語が表示されることを確認
    await expect(tuesdayCell).toContainText('英語')

    // 低優先度の数学は表示されないことを確認
    await expect(tuesdayCell).not.toContainText('数学')
  })

  test('パターン削除後、カレンダーから自動的に消える', async ({ page }) => {
    // パターンリストの最初のパターンを削除
    const patternItem = page.locator('[data-testid="pattern-list-item"]').first()
    const patternText = await patternItem.textContent()

    // 削除ボタンをクリック
    await patternItem.locator('[data-testid="delete-pattern-button"]').click()

    // 確認ダイアログが表示される場合は確認
    const confirmButton = page.locator('[data-testid="confirm-delete-button"]')
    if ((await confirmButton.count()) > 0) {
      await confirmButton.click()
    }

    // 成功メッセージを待つ
    await expect(page.locator('text=パターンを削除しました')).toBeVisible()

    // パターンリストから削除されたことを確認
    await expect(patternItem).not.toBeVisible()

    // カレンダーから該当するパターンが消えることを確認
    // （実際のテストではパターンの内容に基づいてセルを特定）
    await page.reload()

    // 削除したパターンのテキストがカレンダーに表示されないことを確認
    const calendarCells = page.locator('[data-source="pattern"]')
    const cellCount = await calendarCells.count()

    for (let i = 0; i < cellCount; i++) {
      const cell = calendarCells.nth(i)
      const cellText = await cell.textContent()
      expect(cellText).not.toContain(patternText)
    }
  })

  test('パターン期間外の日にパターンが表示されない', async ({ page }) => {
    // 4月1日〜4月15日のパターンを登録
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
    await page.fill('[data-testid="end-date-input"]', '2024-04-15')

    await page.click('[data-testid="submit-pattern-button"]')

    // カレンダーで確認
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    // 4月1日と4月8日にはパターンが表示される
    await expect(
      page.locator('[data-testid="calendar-cell-2024-04-01"]').locator('[data-source="pattern"]')
    ).toBeVisible()

    await expect(
      page.locator('[data-testid="calendar-cell-2024-04-08"]').locator('[data-source="pattern"]')
    ).toBeVisible()

    // 4月15日はパターン期間内だがチェックが必要
    const april15Cell = page.locator('[data-testid="calendar-cell-2024-04-15"]')
    const april15DayOfWeek = new Date('2024-04-15').getDay()

    if (april15DayOfWeek === 1) {
      // 月曜日の場合、パターンが表示される
      await expect(april15Cell.locator('[data-source="pattern"]')).toBeVisible()
    }

    // 4月22日にはパターンが表示されない（期間外）
    const april22Cell = page.locator('[data-testid="calendar-cell-2024-04-22"]')
    await expect(april22Cell.locator('[data-source="pattern"]')).not.toBeVisible()
  })

  test('同一日・同一コマに複数のデータソースが存在する場合の整合性', async ({ page }) => {
    // 優先順位: 通常割当 > 例外 > パターン（高優先度） > パターン（低優先度）

    // 1. パターンを登録
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

    // 2. 例外を登録（4月8日を休みにする）
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    const april8Cell = page.locator('[data-testid="calendar-cell-2024-04-08"]')
    await april8Cell.click({ button: 'right' })
    await page.click('[data-testid="context-menu-cancel"]')

    // 3. 通常割当を登録（4月15日）
    // NOTE: この部分は実際のUIフローに合わせて調整
    await page.click('[data-testid="create-assignment-button"]')

    await page.click('[data-testid="assignment-teacher-select"]')
    await page.click('[data-testid="assignment-teacher-option-2"]')

    await page.click('[data-testid="assignment-student-select"]')
    await page.click('[data-testid="assignment-student-option-2"]')

    await page.click('[data-testid="assignment-subject-select"]')
    await page.click('[data-testid="assignment-subject-option-english"]')

    await page.fill('[data-testid="assignment-date-input"]', '2024-04-15')

    await page.click('[data-testid="assignment-slot-select"]')
    await page.click('[data-testid="assignment-slot-option-A"]')

    await page.click('[data-testid="submit-assignment-button"]')

    // 4. カレンダーで確認
    await page.reload()

    // 4月1日: パターンのみ
    const april1Cell = page.locator('[data-testid="calendar-cell-2024-04-01"]')
    await expect(april1Cell.locator('[data-source="pattern"]')).toBeVisible()

    // 4月8日: 例外（休み）
    await expect(april8Cell.locator('[data-source="exception"]')).toBeVisible()
    await expect(april8Cell.locator('[data-testid="cancelled-badge"]')).toBeVisible()

    // 4月15日: 通常割当
    const april15Cell = page.locator('[data-testid="calendar-cell-2024-04-15"]')
    await expect(april15Cell.locator('[data-source="assignment"]')).toBeVisible()
    await expect(april15Cell).toContainText('英語')
  })

  test('パターン更新時にカレンダーが自動的に再展開される', async ({ page }) => {
    // パターンを登録
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
    await page.fill('[data-testid="end-date-input"]', '2024-04-15')

    await page.click('[data-testid="submit-pattern-button"]')

    // パターンを編集（終了日を延長）
    const patternItem = page.locator('[data-testid="pattern-list-item"]').first()
    await patternItem.locator('[data-testid="edit-pattern-button"]').click()

    // 終了日を変更
    await page.fill('[data-testid="end-date-input"]', '2024-04-30')

    await page.click('[data-testid="submit-pattern-button"]')

    // カレンダーで確認
    await page.click('[data-testid="month-selector"]')
    await page.click('[data-testid="month-option-2024-04"]')

    // 4月22日にもパターンが表示されることを確認（延長後）
    const april22Cell = page.locator('[data-testid="calendar-cell-2024-04-22"]')
    await expect(april22Cell.locator('[data-source="pattern"]')).toBeVisible()
  })
})
