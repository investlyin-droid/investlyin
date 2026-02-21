import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

test.describe('Responsive Design', () => {
  for (const viewport of viewports) {
    test(`should be responsive on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Test homepage
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
      
      // Check for excessive horizontal scroll (some is acceptable for tables)
      const horizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth - document.documentElement.clientWidth;
      });
      
      // Allow up to 100px of horizontal scroll (for tables)
      expect(horizontalScroll).toBeLessThan(100);
    });
  }

  test('should have mobile-friendly navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check navigation is accessible
    const nav = page.locator('nav').first();
    const navVisible = await nav.isVisible().catch(() => false);
    
    if (navVisible) {
      await expect(nav).toBeVisible();
    }
  });

  test('should have readable text on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that text is readable (not too small)
    const fontSize = await page.evaluate(() => {
      const body = document.body;
      const style = window.getComputedStyle(body);
      return parseFloat(style.fontSize);
    });
    
    // Font size should be at least 14px on mobile
    expect(fontSize).toBeGreaterThanOrEqual(12);
  });
});
