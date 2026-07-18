import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Navigate to the login page (or homepage if it has a login modal)
    await page.goto('/');

    // We assume there's a login button or we navigate to /login
    // Assuming a login link in the header or sidebar
    const loginButton = page.getByRole('button', { name: /login|sign in/i });
    if (await loginButton.isVisible()) {
      await loginButton.click();
    } else {
      await page.goto('/login');
    }

    // Fill in the login form
    await page.getByLabel(/email/i).fill('testuser@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Submit the form
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Verify successful login
    // e.g., the user profile avatar or logout button becomes visible
    await expect(page.getByRole('button', { name: /logout|sign out|profile/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');

    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Verify error message is shown (using toast or inline error)
    await expect(page.getByText(/invalid login credentials|error/i)).toBeVisible();
  });
});
