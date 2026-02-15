import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

/**
 * Task 9.1: パターン登録フローのE2Eテスト
 *
 * RecurringPatternFormでのパターン作成、バリデーション、
 * エラーハンドリング、成功時のリスト更新をテスト
 */

test.describe('定期授業パターン登録フロー', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await loginAsTestUser(page)

    // 月次カレンダーページに移動
    await page.goto('/monthly-calendar')

    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle')
  })

  test('パターンを正常に登録できる', async ({ page }) => {
    // 「パターン表示」トグルをONにする
    const toggleButton = page.locator('[data-testid="toggle-patterns"]')
    await toggleButton.click()

    // パターンリストが表示されることを確認
    await expect(page.locator('[data-testid="pattern-list"]')).toBeVisible()

    // 「新規パターン追加」ボタンをクリック
    await page.click('[data-testid="add-pattern-button"]')

    // モーダルが開くことを確認
    await expect(page.locator('[data-testid="pattern-modal"]')).toBeVisible()

    // フォームに入力
    // 講師を選択（例: 田中先生）
    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-1"]')

    // 生徒を選択（例: 太郎くん）
    await page.click('[data-testid="student-select"]')
    await page.click('[data-testid="student-option-1"]')

    // 科目を選択（例: 数学）
    await page.click('[data-testid="subject-select"]')
    await page.click('[data-testid="subject-option-math"]')

    // 曜日を選択（例: 月曜日）
    await page.click('[data-testid="day-of-week-select"]')
    await page.click('[data-testid="day-option-monday"]')

    // コマを選択（例: コマA）
    await page.click('[data-testid="slot-select"]')
    await page.click('[data-testid="slot-option-A"]')

    // 開始日を入力
    await page.fill('[data-testid="start-date-input"]', '2024-04-01')

    // 終了日を入力
    await page.fill('[data-testid="end-date-input"]', '2024-09-30')

    // 優先度を選択（例: 高）
    await page.click('[data-testid="priority-select"]')
    await page.click('[data-testid="priority-option-high"]')

    // 登録ボタンをクリック
    await page.click('[data-testid="submit-pattern-button"]')

    // モーダルが閉じることを確認
    await expect(page.locator('[data-testid="pattern-modal"]')).not.toBeVisible({
      timeout: 5000,
    })

    // 成功メッセージが表示されることを確認
    await expect(page.locator('text=パターンを登録しました')).toBeVisible()

    // パターンリストに新しいパターンが表示されることを確認
    await expect(
      page.locator('[data-testid="pattern-list"] >> text=毎週月曜日 コマA')
    ).toBeVisible()
  })

  test('必須フィールドのバリデーションが機能する', async ({ page }) => {
    // 「パターン表示」トグルをONにする
    await page.click('[data-testid="toggle-patterns"]')

    // 「新規パターン追加」ボタンをクリック
    await page.click('[data-testid="add-pattern-button"]')

    // モーダルが開くことを確認
    await expect(page.locator('[data-testid="pattern-modal"]')).toBeVisible()

    // 何も入力せずに登録ボタンをクリック
    await page.click('[data-testid="submit-pattern-button"]')

    // バリデーションエラーが表示されることを確認
    await expect(page.locator('text=講師を選択してください')).toBeVisible()
    await expect(page.locator('text=生徒を選択してください')).toBeVisible()
    await expect(page.locator('text=科目を選択してください')).toBeVisible()
    await expect(page.locator('text=曜日を選択してください')).toBeVisible()
    await expect(page.locator('text=コマを選択してください')).toBeVisible()
    await expect(page.locator('text=開始日を入力してください')).toBeVisible()

    // モーダルが開いたままであることを確認
    await expect(page.locator('[data-testid="pattern-modal"]')).toBeVisible()
  })

  test('日付の整合性バリデーションが機能する', async ({ page }) => {
    // 「パターン表示」トグルをONにする
    await page.click('[data-testid="toggle-patterns"]')

    // 「新規パターン追加」ボタンをクリック
    await page.click('[data-testid="add-pattern-button"]')

    // 必須フィールドを入力
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

    // 終了日が開始日より前の日付を入力
    await page.fill('[data-testid="start-date-input"]', '2024-09-30')
    await page.fill('[data-testid="end-date-input"]', '2024-04-01')

    // 登録ボタンをクリック
    await page.click('[data-testid="submit-pattern-button"]')

    // エラーメッセージが表示されることを確認
    await expect(
      page.locator('text=終了日は開始日より後の日付を指定してください')
    ).toBeVisible()

    // モーダルが開いたままであることを確認
    await expect(page.locator('[data-testid="pattern-modal"]')).toBeVisible()
  })

  test('重複パターンのエラーハンドリングが機能する', async ({ page }) => {
    // 「パターン表示」トグルをONにする
    await page.click('[data-testid="toggle-patterns"]')

    // 最初のパターンを登録
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
    await page.fill('[data-testid="end-date-input"]', '2024-09-30')

    await page.click('[data-testid="submit-pattern-button"]')

    // 成功メッセージを待つ
    await expect(page.locator('text=パターンを登録しました')).toBeVisible()

    // 同じパターンをもう一度登録
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
    await page.fill('[data-testid="end-date-input"]', '2024-09-30')

    await page.click('[data-testid="submit-pattern-button"]')

    // エラーメッセージが表示されることを確認
    await expect(
      page.locator('text=指定された条件のパターンは既に存在します')
    ).toBeVisible()

    // モーダルが開いたままであることを確認
    await expect(page.locator('[data-testid="pattern-modal"]')).toBeVisible()
  })

  test('キャンセルボタンでモーダルを閉じることができる', async ({ page }) => {
    // 「パターン表示」トグルをONにする
    await page.click('[data-testid="toggle-patterns"]')

    // 「新規パターン追加」ボタンをクリック
    await page.click('[data-testid="add-pattern-button"]')

    // モーダルが開くことを確認
    await expect(page.locator('[data-testid="pattern-modal"]')).toBeVisible()

    // 何か入力
    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-1"]')

    // キャンセルボタンをクリック
    await page.click('[data-testid="cancel-pattern-button"]')

    // モーダルが閉じることを確認
    await expect(page.locator('[data-testid="pattern-modal"]')).not.toBeVisible()

    // パターンリストに新しいパターンが追加されていないことを確認（リストの件数をチェック）
    const initialPatternCount = await page
      .locator('[data-testid="pattern-list-item"]')
      .count()

    // もう一度開いて何か入力してキャンセル
    await page.click('[data-testid="add-pattern-button"]')
    await page.click('[data-testid="teacher-select"]')
    await page.click('[data-testid="teacher-option-1"]')
    await page.click('[data-testid="cancel-pattern-button"]')

    // パターン数が変わっていないことを確認
    const currentPatternCount = await page
      .locator('[data-testid="pattern-list-item"]')
      .count()
    expect(currentPatternCount).toBe(initialPatternCount)
  })

  test('権限エラーのハンドリングが機能する', async ({ page }) => {
    // NOTE: このテストは、権限のないユーザーでログインした場合の動作をテスト
    // 実際の実装に合わせて調整が必要

    // 「パターン表示」トグルをONにする
    await page.click('[data-testid="toggle-patterns"]')

    // パターン追加ボタンが表示されないか、無効化されていることを確認
    // （権限がない場合の動作は実装による）
    const addButton = page.locator('[data-testid="add-pattern-button"]')

    // ボタンが存在しないか、無効化されているかのいずれか
    const isDisabledOrHidden =
      (await addButton.count()) === 0 || (await addButton.isDisabled())

    expect(isDisabledOrHidden).toBeTruthy()
  })
})
