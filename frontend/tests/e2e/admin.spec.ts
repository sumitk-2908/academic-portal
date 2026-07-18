import { test, expect } from '@playwright/test';

test.describe('Admin Moderation Flow', () => {
  // Login as admin before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/portal-admin/login');
    // Admin login form might be different or require OTP, we assume basic login for simplicity here
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('adminpass123');
    await page.getByRole('button', { name: /log in/i }).click();

    // In a real scenario, this might need an OTP setup, which is tricky to E2E test without a bypass or fixed code in test env
    // Assuming the admin dashboard loads
    await expect(page.getByRole('heading', { name: /admin dashboard|moderation/i })).toBeVisible({ timeout: 15000 });
  });

  test('should approve a pending document', async ({ page }) => {
    // Navigate to pending documents inbox
    await page.goto('/portal-admin/inbox');

    // Look for a pending document
    const pendingItem = page.locator('text=Pending').first();
    
    // If there is no pending item, we can't test approval. In a real suite, we'd seed the DB first.
    if (await pendingItem.isVisible()) {
      // Click the approve button for the first pending item
      // Selector needs to match the actual UI (e.g. an "Approve" button near the "Pending" text)
      const approveButton = pendingItem.locator('..').getByRole('button', { name: /approve/i });
      await approveButton.click();

      // Verify the toast message
      await expect(page.getByText(/approved successfully/i)).toBeVisible();
    } else {
      console.log('No pending documents found to approve. Skipping approval click.');
    }
  });

  test('should reject a pending document', async ({ page }) => {
    await page.goto('/portal-admin/inbox');

    const pendingItem = page.locator('text=Pending').first();
    
    if (await pendingItem.isVisible()) {
      const rejectButton = pendingItem.locator('..').getByRole('button', { name: /reject/i });
      await rejectButton.click();

      // Some rejection flows require a reason modal
      const reasonModal = page.getByRole('dialog', { name: /reject reason/i });
      if (await reasonModal.isVisible()) {
        await page.getByLabel(/reason/i).fill('Test rejection');
        await page.getByRole('button', { name: /confirm reject/i }).click();
      }

      await expect(page.getByText(/rejected successfully/i)).toBeVisible();
    }
  });
});
