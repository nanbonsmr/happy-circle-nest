import { describe, it, expect } from "vitest";
import { seededShuffle, parseSeed, shuffleOptions } from "@/lib/seededShuffle";

describe("parseSeed", () => {
  it("parses valid numeric string", () => expect(parseSeed("42")).toBe(42));
  it("returns null for empty string", () => {
    expect(parseSeed("")).toBeNull();
    expect(parseSeed("   ")).toBeNull();
  });
  it("returns null for non-numeric", () => expect(parseSeed("abc")).toBeNull());
  it("converts negative to positive", () => expect(parseSeed("-5")).toBe(5));
});

describe("seededShuffle", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("is deterministic", () => {
    expect(seededShuffle(items, 42)).toEqual(seededShuffle(items, 42));
  });
  it("different seeds → different order", () => {
    expect(seededShuffle(items, 1)).not.toEqual(seededShuffle(items, 2));
  });
  it("does not mutate original", () => {
    const copy = [...items];
    seededShuffle(items, 99);
    expect(items).toEqual(copy);
  });
  it("preserves all elements", () => {
    expect(seededShuffle(items, 7).sort((a, b) => a - b)).toEqual(items);
  });
  it("handles empty array", () => expect(seededShuffle([], 1)).toEqual([]));
  it("handles single element", () => expect(seededShuffle([42], 1)).toEqual([42]));
});

describe("shuffleOptions", () => {
  const options = [
    { key: "A", text: "Paris" },
    { key: "B", text: "London" },
    { key: "C", text: "Berlin" },
    { key: "D", text: "Madrid" },
  ];

  it("preserves correct answer after shuffle", () => {
    const { shuffled, newCorrectKey } = shuffleOptions(options, "A", 42);
    expect(shuffled.find((o) => o.key === newCorrectKey)?.text).toBe("Paris");
  });

  it("is deterministic", () => {
    const r1 = shuffleOptions(options, "B", 100);
    const r2 = shuffleOptions(options, "B", 100);
    expect(r1).toEqual(r2);
  });

  it("keeps all four options", () => {
    const { shuffled } = shuffleOptions(options, "C", 7);
    expect(shuffled).toHaveLength(4);
    expect(shuffled.map((o) => o.text).sort()).toEqual(["Berlin", "London", "Madrid", "Paris"]);
  });
});
