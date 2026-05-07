import { describe, it, expect } from "vitest";
import { deriveWatchlistHealth, normaliseMetricFields } from "./AdminPage";
import type { VesselRow, MetricsRow } from "../lib/duckdb";

const vessel = (confidence: number, region = "singapore"): VesselRow => ({
  mmsi: "123456789",
  imo: null,
  vessel_name: "Test",
  flag: "SG",
  vessel_type: "tanker",
  confidence,
  last_lat: 1.0,
  last_lon: 103.0,
  last_seen: "2026-05-07",
  region,
  top_signals: null,
  ais_gap_count_30d: null,
  sts_candidate_count: null,
});

describe("deriveWatchlistHealth", () => {
  it("returns zero counts for empty vessel list", () => {
    const { highConfidence, byRegion } = deriveWatchlistHealth([]);
    expect(highConfidence).toBe(0);
    expect(byRegion).toHaveLength(0);
  });

  it("counts high-confidence vessels (≥ 0.75)", () => {
    const vessels = [vessel(0.90), vessel(0.75), vessel(0.74), vessel(0.50)];
    expect(deriveWatchlistHealth(vessels).highConfidence).toBe(2);
  });

  it("groups vessels by region sorted by count descending", () => {
    const vessels = [
      vessel(0.80, "singapore"),
      vessel(0.60, "singapore"),
      vessel(0.90, "japan"),
    ];
    const { byRegion } = deriveWatchlistHealth(vessels);
    expect(byRegion[0].region).toBe("singapore");
    expect(byRegion[0].count).toBe(2);
    expect(byRegion[1].region).toBe("japan");
    expect(byRegion[1].count).toBe(1);
  });

  it("counts high-confidence vessels per region", () => {
    const vessels = [
      vessel(0.80, "singapore"),
      vessel(0.60, "singapore"),
    ];
    const { byRegion } = deriveWatchlistHealth(vessels);
    expect(byRegion[0].highCount).toBe(1);
  });

});

describe("normaliseMetricFields", () => {
  it("returns all nulls for null metrics", () => {
    const { p50, auroc, recall, modelVersion } = normaliseMetricFields(null);
    expect(p50).toBeNull();
    expect(auroc).toBeNull();
    expect(recall).toBeNull();
    expect(modelVersion).toBeNull();
  });

  it("reads backtest_p_at_50 and backtest_auroc (fixture field names)", () => {
    const metrics: MetricsRow = {
      backtest_p_at_50: 0.68,
      backtest_auroc: 0.91,
      backtest_recall_at_200: 0.85,
      model_version: "v1.2.0",
    };
    const result = normaliseMetricFields(metrics);
    expect(result.p50).toBe(0.68);
    expect(result.auroc).toBe(0.91);
    expect(result.recall).toBe(0.85);
    expect(result.modelVersion).toBe("v1.2.0");
  });

  it("falls back to precision_at_50 / auroc when backtest_ fields absent", () => {
    const metrics: MetricsRow = { precision_at_50: 0.55, auroc: 0.88 };
    const result = normaliseMetricFields(metrics);
    expect(result.p50).toBe(0.55);
    expect(result.auroc).toBe(0.88);
  });

  it("falls back to backtest_summary_ fields as last resort", () => {
    const metrics: MetricsRow = {
      backtest_summary_p_at_50: 0.40,
      backtest_summary_auroc: 0.80,
    };
    const result = normaliseMetricFields(metrics);
    expect(result.p50).toBe(0.40);
    expect(result.auroc).toBe(0.80);
  });
});
