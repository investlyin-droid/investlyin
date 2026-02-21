import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Trading Platform/i);
  });

  test('should display account tiers with correct minimums', async ({ page }) => {
    // Scroll to account types section
    const accountSection = page.locator('text=Standard Account').first();
    await accountSection.scrollIntoViewIfNeeded();
    
    // Verify Standard Account
    await expect(page.locator('text=Standard Account').first()).toBeVisible();
    await expect(page.locator('text=Minimum deposit: $100').first()).toBeVisible();
    
    // Verify Pro Account
    await expect(page.locator('text=Pro Account').first()).toBeVisible();
    await expect(page.locator('text=Minimum deposit: $1,000').first()).toBeVisible();
    
    // Verify Zero Account
    await expect(page.locator('text=Zero Account').first()).toBeVisible();
    await expect(page.locator('text=Minimum deposit: $5,000').first()).toBeVisible();
    await expect(page.locator('text=$1,000 welcome bonus').first()).toBeVisible();
  });

  test('should display withdrawal information in FAQ', async ({ page }) => {
    // Scroll to FAQ section
    const faqSection = page.locator('text=How do I withdraw funds?').first();
    await faqSection.scrollIntoViewIfNeeded();
    
    // Check withdrawal processing time
    await expect(page.locator('text=24-48 hours').first()).toBeVisible();
  });

  test('should display trading calculator', async ({ page }) => {
    // Scroll to tools section
    const toolsSection = page.locator('text=Trading Calculator').first();
    await toolsSection.scrollIntoViewIfNeeded();
    
    await expect(page.locator('text=Trading Calculator').first()).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that navigation is accessible
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    
    // Check that hero section is visible
    const hero = page.locator('h1').first();
    await expect(hero).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    // Test Register link
    const registerLink = page.locator('a[href*="register"]').first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/.*register.*/);
      await page.goBack();
    }
    
    // Test Login link
    const loginLink = page.locator('a[href*="login"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/.*login.*/);
    }
  });
});
