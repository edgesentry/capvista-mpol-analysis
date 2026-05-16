import { describe, it, expect } from "vitest";
import {
  normalizeAttributions,
  parseOwnershipChain,
  parseSignals,
  formatSanctionsDistance,
  ownershipRelationLabel,
} from "./vesselDetailUtils";

describe("parseSignals", () => {
  it("parses a valid JSON array", () => {
    const raw = JSON.stringify([
      { feature: "ais_gap_count_30d", value: 4, contribution: 0.4 },
      { feature: "sanctions_distance", value: 1, contribution: 0.35 },
    ]);
    expect(parseSignals(raw)).toHaveLength(2);
  });

  it("returns empty for invalid JSON", () => {
    expect(parseSignals("not-json")).toEqual([]);
  });
});

describe("normalizeAttributions", () => {
  it("allocates shares that sum to ~100%", () => {
    const rows = normalizeAttributions([
      { feature: "a", value: 1, contribution: 0.4 },
      { feature: "b", value: 2, contribution: 0.35 },
      { feature: "c", value: 3, contribution: 0.25 },
    ]);
    const sum = rows.reduce((s, r) => s + r.sharePct, 0);
    expect(sum).toBeCloseTo(100, 5);
    expect(rows[0].feature).toBe("a");
  });

  it("ignores non-positive contributions", () => {
    const rows = normalizeAttributions([
      { feature: "a", value: 1, contribution: 1 },
      { feature: "b", value: 0, contribution: -0.2 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].sharePct).toBe(100);
  });
});

describe("parseOwnershipChain", () => {
  it("parses hop objects from JSON", () => {
    const raw = JSON.stringify([
      { hop: 0, kind: "vessel", name: "TEST", country: "", sanctioned: false },
      { hop: 1, kind: "company", name: "Seawind Ltd", country: "PA", sanctioned: false, relation: "operator" },
    ]);
    const chain = parseOwnershipChain(raw);
    expect(chain).toHaveLength(2);
    expect(chain[1].name).toBe("Seawind Ltd");
  });
});

describe("formatSanctionsDistance", () => {
  it("describes direct and hop distances", () => {
    expect(formatSanctionsDistance(0)).toContain("Directly");
    expect(formatSanctionsDistance(1)).toContain("1 hop");
    expect(formatSanctionsDistance(99)).toContain("No sanctions");
  });
});

describe("ownershipRelationLabel", () => {
  it("maps hop kinds and relations to display labels", () => {
    expect(ownershipRelationLabel(undefined, "vessel")).toBe("Vessel");
    expect(ownershipRelationLabel("operator", "company")).toBe("Operator");
    expect(ownershipRelationLabel("controlled_by", "company")).toBe("Parent company");
    expect(ownershipRelationLabel(undefined, "sanction")).toBe("Sanctions listing");
  });
});
