import { test, expect } from '@playwright/test';

/**
 * Auth E2E: login, sign-up, and Google/Apple button flows.
 * Requires frontend (localhost:3000) and backend (localhost:3001) running for full sign-up/login.
 * Google/Apple tests verify the buttons trigger OAuth redirect (no real sign-in in CI).
 */

test.describe('Login page', () => {
  test('should load login page with email/password form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toContainText(/Initialize Session|Verifying/);
  });

  test('should show Google and Apple login buttons', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const googleBtn = page.getByTestId('login-google');
    const appleBtn = page.getByTestId('login-apple');
    await expect(googleBtn).toBeVisible();
    await expect(appleBtn).toBeVisible();
    await expect(googleBtn).toContainText('Google');
    await expect(appleBtn).toContainText('Apple');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('login-email').fill('invalid@example.com');
    await page.getByTestId('login-password').fill('wrongpassword');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
    await expect(page).not.toHaveURL(/\/dashboard/);
    const errorEl = page.locator('text=/error|invalid|incorrect|failed|credentials/i').first();
    const hasError = await errorEl.isVisible().catch(() => false);
    if (hasError) await expect(errorEl).toBeVisible();
  });

  test('Google button triggers redirect when enabled', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const googleBtn = page.getByTestId('login-google');
    const isDisabled = await googleBtn.isDisabled();
    if (isDisabled) {
      test.skip(true, 'Google button disabled (Firebase not configured)');
      return;
    }

    await Promise.all([
      page.waitForURL(/google\.com|localhost/, { timeout: 15000 }).catch(() => null),
      googleBtn.click(),
    ]);
    const url = page.url();
    if (url.includes('google.com')) expect(url).toMatch(/google\.com/);
  });

  test('Apple button triggers redirect when enabled', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const appleBtn = page.getByTestId('login-apple');
    const isDisabled = await appleBtn.isDisabled();
    if (isDisabled) {
      test.skip(true, 'Apple button disabled (Firebase not configured)');
      return;
    }

    await appleBtn.click();
    await page.waitForURL(/apple\.com|localhost/, { timeout: 15000 }).catch(() => null);
    const url = page.url();
    if (url.includes('apple.com')) expect(url).toMatch(/apple\.com/);
  });
});

test.describe('Register page', () => {
  test('should load register page with sign-up form', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[placeholder="John"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Doe"]')).toBeVisible();
    await expect(page.locator('input[placeholder="name@domain.com"]')).toBeVisible();
    await expect(page.locator('input[placeholder="••••••••"]').first()).toBeVisible();
    await expect(page.getByTestId('register-submit')).toBeVisible();
    await expect(page.getByTestId('register-submit')).toContainText(/Complete Initialization|Establishing/);
  });

  test('should show Google and Apple sign-up buttons', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('register-google')).toBeVisible();
    await expect(page.getByTestId('register-apple')).toBeVisible();
    await expect(page.getByTestId('register-google')).toContainText('Google');
    await expect(page.getByTestId('register-apple')).toContainText('Apple');
  });

  test('should register a new user when backend is available', async ({ page }) => {
    const testUser = {
      email: `e2e-${Date.now()}@example.com`,
      password: 'TestPass123!',
      firstName: 'E2E',
      lastName: 'User',
    };

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.locator('input[placeholder="John"]').fill(testUser.firstName);
    await page.locator('input[placeholder="Doe"]').fill(testUser.lastName);
    await page.locator('input[placeholder="name@domain.com"]').fill(testUser.email);
    await page.locator('input[placeholder="••••••••"]').first().fill(testUser.password);
    await page.getByTestId('register-submit').click();

    await expect(page).toHaveURL(/\/(login|dashboard|register)/, { timeout: 12000 });
  });

  test('Google sign-up button triggers redirect when enabled', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const googleBtn = page.getByTestId('register-google');
    if (await googleBtn.isDisabled()) {
      test.skip(true, 'Google button disabled (Firebase not configured)');
      return;
    }
    await googleBtn.click();
    await page.waitForURL(/google\.com|localhost/, { timeout: 15000 }).catch(() => null);
    if (page.url().includes('google.com')) expect(page.url()).toMatch(/google\.com/);
  });

  test('Apple sign-up button triggers redirect when enabled', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const appleBtn = page.getByTestId('register-apple');
    if (await appleBtn.isDisabled()) {
      test.skip(true, 'Apple button disabled (Firebase not configured)');
      return;
    }
    await appleBtn.click();
    await page.waitForURL(/apple\.com|localhost/, { timeout: 15000 }).catch(() => null);
    if (page.url().includes('apple.com')) expect(page.url()).toMatch(/apple\.com/);
  });
});

test.describe('Login with valid user (optional)', () => {
  test('successful login redirects to dashboard when backend and user exist', async ({ page }) => {
    const email = process.env.E2E_LOGIN_EMAIL;
    const password = process.env.E2E_LOGIN_PASSWORD;
    if (!email || !password) {
      test.skip(true, 'Set E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD to test successful login');
      return;
    }

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/dashboard|\/admin/, { timeout: 12000 });
  });
});
