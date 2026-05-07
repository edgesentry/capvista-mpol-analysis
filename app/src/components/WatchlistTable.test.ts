import { describe, it, expect } from "vitest";
import { attColor } from "./WatchlistTable";

describe("attColor", () => {
  it("returns muted grey for non-significant ATT regardless of magnitude", () => {
    expect(attColor(0.5, false)).toBe("#4a5568");
    expect(attColor(-0.5, false)).toBe("#4a5568");
    expect(attColor(0.0, false)).toBe("#4a5568");
  });

  it("returns red for significant ATT ≥ 0.30", () => {
    expect(attColor(0.30, true)).toBe("#fc8181");
    expect(attColor(0.50, true)).toBe("#fc8181");
    expect(attColor(1.00, true)).toBe("#fc8181");
  });

  it("returns amber for significant ATT in [0.10, 0.30)", () => {
    expect(attColor(0.10, true)).toBe("#f6ad55");
    expect(attColor(0.20, true)).toBe("#f6ad55");
    expect(attColor(0.29, true)).toBe("#f6ad55");
  });

  it("returns green for significant ATT < 0.10", () => {
    expect(attColor(0.09, true)).toBe("#68d391");
    expect(attColor(0.00, true)).toBe("#68d391");
    expect(attColor(-0.10, true)).toBe("#68d391");
  });
});
