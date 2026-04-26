import { describe, it, expect } from "vitest";
import {
  seededShuffle,
  parseSeed,
  shuffleOptions,
  pickVariantSeed,
  hashString,
} from "@/lib/seededShuffle";

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

describe("hashString", () => {
  it("is deterministic", () => {
    expect(hashString("student-001")).toBe(hashString("student-001"));
  });
  it("returns different hashes for different inputs", () => {
    expect(hashString("student-001")).not.toBe(hashString("student-002"));
  });
  it("returns a non-negative 32-bit integer", () => {
    const h = hashString("anything");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("pickVariantSeed", () => {
  it("returns null when variant count is missing or 1", () => {
    expect(pickVariantSeed(null, "s1")).toBeNull();
    expect(pickVariantSeed(0, "s1")).toBeNull();
    expect(pickVariantSeed(1, "s1")).toBeNull();
  });

  it("is stable for the same student", () => {
    expect(pickVariantSeed(4, "alice")).toBe(pickVariantSeed(4, "alice"));
  });

  it("distributes across N variants", () => {
    // With 4 variants, hashing many students should produce up to 4 unique seeds.
    const seeds = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const s = pickVariantSeed(4, `student-${i}`);
      if (s != null) seeds.add(s);
    }
    expect(seeds.size).toBeGreaterThan(1);
    expect(seeds.size).toBeLessThanOrEqual(4);
  });

  it("produces shuffles that stay within blocks (integration check)", () => {
    // Section A and Section B questions — verify variants reorder within each
    // section independently and never cross sections.
    const sectionA = ["A1", "A2", "A3", "A4", "A5"];
    const sectionB = ["B1", "B2", "B3"];

    const shuffleByVariant = (studentId: string) => {
      const seed = pickVariantSeed(4, studentId)!;
      const aShuffled = seededShuffle(sectionA, seed + 0);
      const bShuffled = seededShuffle(sectionB, seed + 1);
      return [...aShuffled, ...bShuffled];
    };

    const result = shuffleByVariant("student-x");
    // First 5 must all be from section A, last 3 from section B
    expect(result.slice(0, 5).every((q) => q.startsWith("A"))).toBe(true);
    expect(result.slice(5).every((q) => q.startsWith("B"))).toBe(true);
  });
});

describe("shuffleOptions (legacy — options no longer shuffled in exam flow)", () => {
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

  it("keeps all four options", () => {
    const { shuffled } = shuffleOptions(options, "C", 7);
    expect(shuffled).toHaveLength(4);
    expect(shuffled.map((o) => o.text).sort()).toEqual(["Berlin", "London", "Madrid", "Paris"]);
  });
});
