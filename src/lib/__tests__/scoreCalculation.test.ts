import { describe, it, expect } from "vitest";

interface Answer { is_correct: boolean | null }

function calculateScore(answers: Answer[], marks = 5) {
  const correct = answers.filter((a) => a.is_correct === true).length;
  const total = answers.length * marks;
  return { score: correct * marks, total, percentage: total > 0 ? Math.round((correct * marks / total) * 100) : 0 };
}

describe("calculateScore", () => {
  it("100% when all correct", () => {
    expect(calculateScore([{ is_correct: true }, { is_correct: true }])).toEqual({ score: 10, total: 10, percentage: 100 });
  });
  it("0% when none correct", () => {
    expect(calculateScore([{ is_correct: false }, { is_correct: false }])).toEqual({ score: 0, total: 10, percentage: 0 });
  });
  it("handles null (unanswered)", () => {
    expect(calculateScore([{ is_correct: null }, { is_correct: true }])).toEqual({ score: 5, total: 10, percentage: 50 });
  });
  it("empty array → 0", () => {
    expect(calculateScore([])).toEqual({ score: 0, total: 0, percentage: 0 });
  });
  it("custom marks", () => {
    expect(calculateScore([{ is_correct: true }], 10)).toEqual({ score: 10, total: 10, percentage: 100 });
  });
});
