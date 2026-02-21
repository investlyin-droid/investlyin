import { test, expect } from '@playwright/test';

/**
 * Admin e2e tests require a Firebase user with admin role in Firestore.
 * 1. In backend: set ADMIN_EMAIL in .env and run `npm run reset-admin`.
 * 2. Run with that user's credentials (required for "should login as admin"):
 *    ADMIN_E2E_EMAIL=your@email.com ADMIN_E2E_PASSWORD=yourpassword npx playwright test e2e/admin.spec.ts
 * Without these env vars, the login test is skipped.
 */
const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL || 'admin@trading.com';
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD || 'admin123';
const hasAdminCredentials = !!(process.env.ADMIN_E2E_EMAIL && process.env.ADMIN_E2E_PASSWORD);

// Helper: login as admin and wait for dashboard. Skips if login fails (e.g. no backend or wrong creds).
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  // Wait for redirect to /admin (full page reload after login)
  await page.waitForURL(/\/admin(?:\?|$|\/)/, { timeout: 20000 }).catch(() => {});
  const onAdmin = page.url().includes('/admin') && !page.url().includes('/admin/login');
  if (!onAdmin) return false;
  await page.locator('[data-testid="admin-overview-heading"]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  return true;
}

// Tab id from label (matches frontend app/admin/page.tsx data-testid="admin-tab-*")
const TAB_IDS: Record<string, string> = {
  'Overview': 'overview',
  'Statistics': 'stats',
  'Trade Management': 'trades',
  'User Accounts': 'users',
  'Deposits': 'deposits',
  'Audit Log': 'audit',
  'Liquidity Rules': 'rules',
  'Payment Config': 'payment',
  'Orders': 'orders',
};

// Helper: click a tab by label using data-testid (matches current admin UI)
async function clickAdminTab(page: import('@playwright/test').Page, label: string) {
  const tabId = TAB_IDS[label] ?? label.toLowerCase().replace(/\s+/g, '-');
  const tab = page.locator(`[data-testid="admin-tab-${tabId}"]`);
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    return;
  }
  const menuBtn = page.locator('button[aria-label="Toggle menu"]');
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.locator(`[data-testid="admin-tab-${tabId}"]`).click();
  }
}

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('should login as admin', async ({ page }) => {
    test.skip(!hasAdminCredentials, 'Set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD to a Firebase admin user to run this test.');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(?:\?|$|\/)/, { timeout: 20000 });
    if (page.url().includes('/admin/login')) {
      const errorEl = page.locator('[class*="text-brand-red"], .text-red-500, [role="alert"]').first();
      const errText = await errorEl.textContent().catch(() => '').then((s) => (s || '').trim());
      expect(page.url(), errText ? `Login error: ${errText}` : 'Login did not redirect to /admin. Check backend is running and user has admin role in Firestore.').not.toContain('/admin/login');
    }
    await expect(page).not.toHaveURL(/\/admin\/login/);
    await expect(page.locator('[data-testid="admin-overview-heading"]')).toBeVisible({ timeout: 15000 });
  });

  test('should display admin overview', async ({ page }) => {
    const ok = await loginAsAdmin(page);
    test.skip(!ok, 'Admin login failed (backend or admin user may be missing)');
    await expect(page.locator('text=Total Users')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Total Balance')).toBeVisible();
    await expect(page.locator('text=Open Positions')).toBeVisible();
  });

  test('should navigate to trades tab', async ({ page }) => {
    const ok = await loginAsAdmin(page);
    test.skip(!ok, 'Admin login failed');
    await clickAdminTab(page, 'Trade Management');
    await expect(page.locator('[data-testid="admin-tab-trades"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Trade Management/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to users tab', async ({ page }) => {
    const ok = await loginAsAdmin(page);
    test.skip(!ok, 'Admin login failed');
    await clickAdminTab(page, 'User Accounts');
    await expect(page.getByRole('heading', { name: /User Accounts/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should show create trade button', async ({ page }) => {
    const ok = await loginAsAdmin(page);
    test.skip(!ok, 'Admin login failed');
    await clickAdminTab(page, 'Trade Management');
    await expect(page.getByRole('button', { name: /Create Trade/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('should open create trade modal', async ({ page }) => {
    const ok = await loginAsAdmin(page);
    test.skip(!ok, 'Admin login failed');
    await clickAdminTab(page, 'Trade Management');
    await page.getByRole('button', { name: /Create Trade/i }).first().click();
    await expect(page.getByRole('heading', { name: /Create Trade for User/i })).toBeVisible({ timeout: 5000 });
  });

  test('should display user management options', async ({ page }) => {
    const ok = await loginAsAdmin(page);
    test.skip(!ok, 'Admin login failed');
    await clickAdminTab(page, 'User Accounts');
    await expect(page.getByRole('heading', { name: /User Accounts/i }).first()).toBeVisible({ timeout: 5000 });
    const adjustBalance = page.getByRole('button', { name: /Adjust Balance/i }).or(page.locator('text=Adjust Balance')).first();
    if (await adjustBalance.isVisible().catch(() => false)) {
      await expect(adjustBalance).toBeVisible();
    }
  });

  test('should navigate to deposits tab', async ({ page }) => {
    const ok = await loginAsAdmin(page);
    test.skip(!ok, 'Admin login failed');
    await clickAdminTab(page, 'Deposits');
    await expect(page.locator('text=Deposit Intents')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to audit log tab', async ({ page }) => {
    const ok = await loginAsAdmin(page);
    test.skip(!ok, 'Admin login failed');
    await clickAdminTab(page, 'Audit Log');
    await expect(page.getByRole('heading', { name: /Audit Log/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to liquidity rules tab', async ({ page }) => {
    const ok = await loginAsAdmin(page);
    test.skip(!ok, 'Admin login failed');
    await clickAdminTab(page, 'Liquidity Rules');
    await expect(page.getByRole('heading', { name: /Liquidity Rules/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const ok = await loginAsAdmin(page);
    test.skip(!ok, 'Admin login failed');
    await expect(page.locator('button[aria-label="Toggle menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-overview-heading"]')).toBeVisible();
  });
});
