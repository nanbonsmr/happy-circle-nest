import { describe, it, expect } from "vitest";

/** Mirrors the validation logic from StudentLogin.tsx */
function validateStudentLogin(studentId: string, password: string): string | null {
  const sid = studentId.trim().toUpperCase();
  const pwd = password.trim();
  if (!sid || !pwd) return "Please enter both Student ID and password.";
  return null;
}

function normalizeStudentId(id: string): string {
  return id.trim().toUpperCase();
}

function verifyPassword(input: string, stored: string): boolean {
  return input.trim() === stored;
}

describe("Student login validation", () => {
  it("requires both fields", () => {
    expect(validateStudentLogin("", "pass")).toBe("Please enter both Student ID and password.");
    expect(validateStudentLogin("STU-001", "")).toBe("Please enter both Student ID and password.");
    expect(validateStudentLogin("", "")).toBe("Please enter both Student ID and password.");
  });

  it("returns null on valid input", () => {
    expect(validateStudentLogin("STU-001", "mypass")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(validateStudentLogin("  STU-001  ", "  pass  ")).toBeNull();
  });
});

describe("Student ID normalization", () => {
  it("uppercases", () => expect(normalizeStudentId("stu-001")).toBe("STU-001"));
  it("trims", () => expect(normalizeStudentId("  STU-001  ")).toBe("STU-001"));
});

describe("Password verification", () => {
  it("matches correct password", () => expect(verifyPassword("secret", "secret")).toBe(true));
  it("rejects wrong password", () => expect(verifyPassword("wrong", "secret")).toBe(false));
  it("trims input", () => expect(verifyPassword("  secret  ", "secret")).toBe(true));
  it("is case-sensitive", () => expect(verifyPassword("Secret", "secret")).toBe(false));
});
