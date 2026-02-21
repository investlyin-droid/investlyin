import { test, expect } from '@playwright/test';

test.describe('Navigation and auth redirects', () => {
  test('unauthenticated visit to /dashboard redirects to /login with from param', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('from=%2Fdashboard');
  });

  test('unauthenticated visit to /wallet redirects to /login with from param', async ({ page }) => {
    await page.goto('/wallet');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('from=');
  });

  test('unauthenticated visit to /market redirects to /login', async ({ page }) => {
    await page.goto('/market');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('a[href="/register"]')).toBeVisible();
  });

  test('register page has link to login', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('login page shows form and submit button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('register page shows form and submit button', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('homepage is accessible without auth', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toMatch(/localhost:3000\/?$/);
  });
});
