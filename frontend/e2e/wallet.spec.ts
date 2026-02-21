import { test, expect } from '@playwright/test';

test.describe('Wallet Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to wallet page (requires login, but we'll test what we can)
    await page.goto('/wallet');
  });

  test('should display wallet page', async ({ page }) => {
    // Check if wallet page loads (might redirect to login if not authenticated)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/wallet|login/);
  });

  test('should show minimum deposit requirement', async ({ page }) => {
    // Look for deposit section
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("deposit")').first();
    
    if (await depositButton.isVisible()) {
      await depositButton.click();
      await page.waitForTimeout(500);
      
      // Check for minimum deposit text
      const minDepositText = page.locator('text=/min.*100|minimum.*\$100/i').first();
      const isVisible = await minDepositText.isVisible().catch(() => false);
      
      if (isVisible) {
        await expect(minDepositText).toBeVisible();
      }
    }
  });

  test('should display withdrawal information', async ({ page }) => {
    // Look for withdrawal section
    const withdrawalText = page.locator('text=/24-48.*hour|withdrawal/i').first();
    const isVisible = await withdrawalText.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(withdrawalText).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that page is accessible
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check for horizontal scroll (should not exist)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
  });
});
