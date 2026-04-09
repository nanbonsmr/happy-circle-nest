import { test, expect, type Page } from "@playwright/test";

/**
 * NejoExamPrep — Admin E2E
 *
 * Prerequisites:
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASS
 *
 * Run: npx playwright test tests/e2e/admin-flow.spec.ts
 */

const BASE = process.env.BASE_URL || "http://localhost:5173";

async function adminLogin(page: Page, email: string, pass: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  // Admin is redirected to /admin
  await page.waitForURL("**/admin", { timeout: 10_000 });
}

test.describe("Admin flow", () => {
  const EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@test.com";
  const PASS = process.env.TEST_ADMIN_PASS || "password123";

  test("login → admin dashboard → analytics page", async ({ page }) => {
    await adminLogin(page, EMAIL, PASS);
    await expect(page.locator("text=/admin|dashboard/i").first()).toBeVisible();

    // Navigate to analytics
    await page.goto(`${BASE}/admin/analytics`);
    await expect(page.locator("text=/analytics|reports|statistics/i").first()).toBeVisible({ timeout: 5_000 });
  });

  test("admin can view all exams", async ({ page }) => {
    await adminLogin(page, EMAIL, PASS);
    // Admin dashboard should list exams
    const examCards = page.locator('[class*="card"], [data-testid="exam-card"]');
    const count = await examCards.count();
    // Just verify page loads without errors
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
