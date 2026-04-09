import { describe, it, expect } from "vitest";

/** Mirrors the access code validation used in StudentAccess / ExamReady */
function isValidAccessCode(code: string): boolean {
  const trimmed = code.trim().toUpperCase();
  return trimmed.length >= 4 && trimmed.length <= 20 && /^[A-Z0-9-]+$/.test(trimmed);
}

function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase();
}

describe("Access code validation", () => {
  it("accepts valid codes", () => {
    expect(isValidAccessCode("EXAM-2025")).toBe(true);
    expect(isValidAccessCode("A1B2")).toBe(true);
    expect(isValidAccessCode("MATH-101-FINAL")).toBe(true);
  });

  it("rejects too short codes", () => {
    expect(isValidAccessCode("AB")).toBe(false);
    expect(isValidAccessCode("")).toBe(false);
  });

  it("rejects codes with invalid characters", () => {
    expect(isValidAccessCode("EXAM 2025")).toBe(false); // space
    expect(isValidAccessCode("exam@123")).toBe(false);  // special char
  });

  it("normalizes to uppercase", () => {
    expect(normalizeAccessCode("  exam-2025  ")).toBe("EXAM-2025");
  });
});
