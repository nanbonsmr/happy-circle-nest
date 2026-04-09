import { describe, it, expect } from "vitest";

interface Exam {
  id: string;
  status: string;
  started_at: string | null;
  duration_minutes: number;
}

/** Pure logic extracted from useExamAutoStatus — determines if exam time has expired */
function getExpiredExamIds(exams: Exam[], now: number): string[] {
  return exams
    .filter((e) => {
      if (e.status !== "active" || !e.started_at) return false;
      const endTime = new Date(e.started_at).getTime() + e.duration_minutes * 60_000;
      return now >= endTime;
    })
    .map((e) => e.id);
}

describe("Exam auto-close logic", () => {
  const baseExam: Exam = {
    id: "e1",
    status: "active",
    started_at: "2026-04-09T10:00:00Z",
    duration_minutes: 30,
  };

  it("marks exam expired when time has passed", () => {
    const now = new Date("2026-04-09T10:31:00Z").getTime();
    expect(getExpiredExamIds([baseExam], now)).toEqual(["e1"]);
  });

  it("does not mark exam expired when time remains", () => {
    const now = new Date("2026-04-09T10:20:00Z").getTime();
    expect(getExpiredExamIds([baseExam], now)).toEqual([]);
  });

  it("ignores non-active exams", () => {
    const now = new Date("2026-04-09T11:00:00Z").getTime();
    expect(getExpiredExamIds([{ ...baseExam, status: "completed" }], now)).toEqual([]);
    expect(getExpiredExamIds([{ ...baseExam, status: "draft" }], now)).toEqual([]);
  });

  it("ignores exams without started_at", () => {
    const now = new Date("2026-04-09T11:00:00Z").getTime();
    expect(getExpiredExamIds([{ ...baseExam, started_at: null }], now)).toEqual([]);
  });

  it("handles exactly on the boundary (edge case)", () => {
    const exactEnd = new Date("2026-04-09T10:30:00Z").getTime();
    expect(getExpiredExamIds([baseExam], exactEnd)).toEqual(["e1"]);
  });

  it("handles multiple exams with mixed states", () => {
    const exams: Exam[] = [
      baseExam,
      { id: "e2", status: "active", started_at: "2026-04-09T10:00:00Z", duration_minutes: 60 },
      { id: "e3", status: "completed", started_at: "2026-04-09T09:00:00Z", duration_minutes: 30 },
    ];
    const now = new Date("2026-04-09T10:35:00Z").getTime();
    expect(getExpiredExamIds(exams, now)).toEqual(["e1"]); // e2 still has time, e3 not active
  });
});
