import { test, expect, Page } from '@playwright/test';
import path from 'path';

// 2. Add ': Page' to the parameter
async function loginAsStudent(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'student@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/');
}

// 3. Add ': Page' to the parameter here as well
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'adminPass123!');
  await page.click('button[type="submit"]');
  
  await page.goto('/portal-admin');
  await page.fill('input[placeholder="6-digit code"]', '123456'); 
  await page.click('button:has-text("Verify")');
}

test.describe('Academic Portal Core Workflows', () => {

  test('Authentication Flow: Successful login creates secure session', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'student@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Check if middleware correctly allows access to logged-in routes
    await expect(page.locator('text=Welcome back, Student')).toBeVisible();
    
    // Ensure auth cookie is set
    const cookies = await page.context().cookies();
    const sbCookie = cookies.find(c => c.name.includes('sb-') && c.name.includes('-auth-token'));
    expect(sbCookie).toBeDefined();
  });

  test('Admin Route Protection: Students are blocked from admin hubs', async ({ page }) => {
    await loginAsStudent(page);

    // Attempt to access restricted Inbox
    await page.goto('/subject/admin/inbox');
    
    // Middleware should redirect a non-admin away immediately
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Admin Moderation Hub')).not.toBeVisible();
  });

  test('Document Visibility Rules: Unapproved documents remain hidden', async ({ page }) => {
    await loginAsStudent(page);

    // Upload a new document (status automatically set to 'pending' by backend)
    await page.goto('/contribute');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload PDF")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures/test-doc.pdf'));
    
    await page.fill('input[name="title"]', 'Secret CI Test Notes');
    await page.click('button:has-text("Submit")');
    await expect(page.locator('text=Upload successful')).toBeVisible();

    // Verify it does NOT show up in the public subject feed
    await page.goto('/subject/general');
    await expect(page.locator('text=Secret CI Test Notes')).not.toBeVisible();
  });

  test('Upload -> Approve -> Serve Workflow', async ({ page }) => {
    // 1. Student uploads document
    await loginAsStudent(page);
    await page.goto('/contribute');
    
    // ... file upload logic ...
    await page.setInputFiles('input[type="file"]', path.join(__dirname, 'fixtures/test-doc.pdf'));
    await page.fill('input[name="title"]', 'Calculus Mastery Guide');
    await page.click('button:has-text("Submit")');
    await page.context().clearCookies(); // Logout

    // 2. Admin logs in & approves
    await loginAsAdmin(page);
    await page.goto('/subject/admin/inbox');
    
    // Ensure the document appears in the pending queue
    const pendingDoc = page.locator('article:has-text("Calculus Mastery Guide")');
    await expect(pendingDoc).toBeVisible();

    // Click the Approve button (triggers FastAPI patch endpoint)
    await pendingDoc.locator('button:has-text("Apprv")').click();
    
    // Wait for it to disappear from the pending queue
    await expect(pendingDoc).not.toBeVisible();

    // 3. Verify Document is now served publicly
    await page.goto('/subject/general');
    await expect(page.locator('text=Calculus Mastery Guide')).toBeVisible();
  });

});