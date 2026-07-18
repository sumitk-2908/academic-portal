import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Document Upload Flow', () => {
  // Use a beforeEach to log in before uploading, since upload requires auth
  test.beforeEach(async ({ page }) => {
    // Navigate and login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('testuser@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page.getByRole('button', { name: /logout|sign out|profile/i })).toBeVisible({ timeout: 10000 });
  });

  test('should successfully upload a PDF document', async ({ page }) => {
    await page.goto('/');

    // Find and click the upload button
    const uploadButton = page.getByRole('button', { name: /upload/i });
    await uploadButton.click();

    // Ensure the upload modal is visible
    await expect(page.getByRole('dialog', { name: /upload/i })).toBeVisible();

    // Set the file input (find input type="file")
    const filePath = path.resolve(__dirname, '../fixtures/sample.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Fill metadata fields (assuming subject and module dropdowns or text fields)
    // Note: Adjust selectors based on actual UI implementation
    await page.getByLabel(/title|document name/i).fill('Test Document Title');
    
    const subjectSelect = page.getByLabel(/subject/i);
    if (await subjectSelect.isVisible()) {
      await subjectSelect.selectOption({ index: 1 });
    }

    // Click submit
    await page.getByRole('button', { name: /submit|upload/i }).click();

    // Verify success toast/message or redirection
    await expect(page.getByText(/upload successful|pending approval/i)).toBeVisible({ timeout: 15000 });
  });
});
