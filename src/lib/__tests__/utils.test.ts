import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn – Tailwind class merger", () => {
  it("merges classes", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });
  it("resolves conflicts (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });
  it("handles undefined and null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
  it("returns empty string for no input", () => {
    expect(cn()).toBe("");
  });
});
