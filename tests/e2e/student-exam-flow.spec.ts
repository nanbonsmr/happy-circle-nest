import { test, expect, type Page } from "@playwright/test";

/**
 * NejoExamPrep — Student Exam Flow E2E
 *
 * Prerequisites (set via environment variables):
 *   TEST_STUDENT_ID   – e.g. "STU-0001"
 *   TEST_STUDENT_PASS – the student's current password
 *   TEST_ACCESS_CODE  – access code of a published/active exam
 *
 * Run: npx playwright test tests/e2e/student-exam-flow.spec.ts
 */

const BASE = process.env.BASE_URL || "http://localhost:5173";

async function studentLogin(page: Page, sid: string, pass: string) {
  await page.goto(`${BASE}/student`);
  await page.fill('input[placeholder*="STU"]', sid);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/student/dashboard", { timeout: 10_000 });
}

test.describe("Student exam flow", () => {
  const SID = process.env.TEST_STUDENT_ID || "STU-0001";
  const PASS = process.env.TEST_STUDENT_PASS || "password123";
  const CODE = process.env.TEST_ACCESS_CODE || "TEST-EXAM";

  test("login → dashboard → join exam → ready page", async ({ page }) => {
    // 1. Login
    await studentLogin(page, SID, PASS);
    await expect(page.locator("text=Dashboard")).toBeVisible();

    // 2. Navigate to exam
    await page.goto(`${BASE}/exam/${CODE}`);
    // Should redirect to ready page (auto-skip ID verification)
    await page.waitForURL(`**/exam/${CODE}/ready`, { timeout: 10_000 });

    // 3. Verify ready page shows question count > 0
    const questionInfo = page.locator("text=/\\d+ question/i");
    await expect(questionInfo).toBeVisible({ timeout: 15_000 });
    const text = await questionInfo.textContent();
    const match = text?.match(/(\d+)/);
    expect(Number(match?.[1] || 0)).toBeGreaterThan(0);
  });

  test("submit exam → see completion page", async ({ page }) => {
    await studentLogin(page, SID, PASS);
    await page.goto(`${BASE}/exam/${CODE}`);
    await page.waitForURL(`**/exam/${CODE}/ready`, { timeout: 10_000 });

    // Wait for exam to become active (via realtime or already active)
    const startBtn = page.locator('button:has-text("Start"), button:has-text("Begin")');
    await startBtn.click({ timeout: 30_000 });

    // Answer first question (click any option)
    const firstOption = page.locator('[data-testid="option-A"], .option-btn').first();
    if (await firstOption.isVisible({ timeout: 5_000 })) {
      await firstOption.click();
    }

    // Submit exam
    const submitBtn = page.locator('button:has-text("Submit")');
    if (await submitBtn.isVisible({ timeout: 5_000 })) {
      await submitBtn.click();
      // Confirm dialog if present
      const confirm = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirm.isVisible({ timeout: 2_000 })) await confirm.click();
    }

    await page.waitForURL(`**/exam/${CODE}/complete`, { timeout: 15_000 });
    await expect(page.locator("text=/complete|submitted|done/i")).toBeVisible();
  });
});
