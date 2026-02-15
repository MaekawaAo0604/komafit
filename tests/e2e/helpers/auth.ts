import { Page } from '@playwright/test'

/**
 * E2Eテスト用の認証ヘルパー
 */

export interface TestUser {
  email: string
  password: string
}

/**
 * テスト用のユーザーでログイン
 */
export async function loginAsTestUser(
  page: Page,
  user: TestUser = {
    email: 'test@example.com',
    password: 'testpass123',
  }
): Promise<void> {
  await page.goto('/')

  // ログインフォームが表示されるまで待機
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 5000 })

  // メールアドレスとパスワードを入力
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)

  // ログインボタンをクリック
  await page.click('button[type="submit"]')

  // ダッシュボードに遷移するまで待機
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

/**
 * ログアウト
 */
export async function logout(page: Page): Promise<void> {
  // ログアウトボタンをクリック（実装に応じて調整が必要）
  await page.click('[data-testid="logout-button"]')

  // ログインページに遷移するまで待機
  await page.waitForURL('**/', { timeout: 5000 })
}
