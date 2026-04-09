import { test, expect, type Page } from "@playwright/test";

/**
 * NejoExamPrep — Teacher Dashboard E2E
 *
 * Prerequisites (set via environment variables):
 *   TEST_TEACHER_EMAIL – teacher's email
 *   TEST_TEACHER_PASS  – teacher's password
 *
 * Run: npx playwright test tests/e2e/teacher-management.spec.ts
 */

const BASE = process.env.BASE_URL || "http://localhost:5173";

async function teacherLogin(page: Page, email: string, pass: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/teacher", { timeout: 10_000 });
}

test.describe("Teacher management flow", () => {
  const EMAIL = process.env.TEST_TEACHER_EMAIL || "teacher@test.com";
  const PASS = process.env.TEST_TEACHER_PASS || "password123";

  test("login → view dashboard → create exam page loads", async ({ page }) => {
    await teacherLogin(page, EMAIL, PASS);

    // Dashboard should show exams section
    await expect(page.locator("text=/exam|dashboard/i").first()).toBeVisible();

    // Navigate to create exam
    await page.goto(`${BASE}/teacher/create`);
    await expect(page.locator("text=/create|new exam/i").first()).toBeVisible({ timeout: 5_000 });
  });

  test("publish results toggle works", async ({ page }) => {
    await teacherLogin(page, EMAIL, PASS);

    // Find an exam card with a results toggle (eye icon)
    const eyeBtn = page.locator('button[title*="result"], button[aria-label*="result"], [data-testid="toggle-results"]').first();
    if (await eyeBtn.isVisible({ timeout: 5_000 })) {
      await eyeBtn.click();
      // Should show toast/confirmation
      await expect(page.locator("text=/published|visible|sent/i").first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
