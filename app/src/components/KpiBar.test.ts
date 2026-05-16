import { describe, it, expect } from "vitest";
import { deriveVesselKpis, deriveMetricKpis } from "./KpiBar";
import type { VesselRow, MetricsRow } from "../lib/duckdb";

const vessel = (confidence: number): VesselRow => ({
  mmsi: "123456789",
  imo: null,
  vessel_name: "Test Vessel",
  flag: "SG",
  vessel_type: "tanker",
  confidence,
  last_lat: 1.0,
  last_lon: 103.0,
  last_seen: "2026-05-07",
  region: "singapore",
  top_signals: null,
  ais_gap_count_30d: null,
  sts_candidate_count: null,
  sanctions_distance: null,
  ownership_chain: null,
});

describe("deriveVesselKpis", () => {
  it("returns zeros and dash for empty vessel list", () => {
    const { total, high, avg } = deriveVesselKpis([]);
    expect(total).toBe(0);
    expect(high).toBe(0);
    expect(avg).toBe("—");
  });

  it("counts high-confidence vessels (≥ 0.75)", () => {
    const vessels = [vessel(0.90), vessel(0.75), vessel(0.60), vessel(0.50)];
    const { total, high } = deriveVesselKpis(vessels);
    expect(total).toBe(4);
    expect(high).toBe(2);
  });

  it("computes average confidence to 3 decimal places", () => {
    const vessels = [vessel(0.80), vessel(0.60)];
    const { avg } = deriveVesselKpis(vessels);
    expect(avg).toBe("0.700");
  });
});

describe("deriveMetricKpis", () => {
  it("returns all nulls for null metrics", () => {
    const kpis = deriveMetricKpis(null);
    expect(kpis.p50).toBeNull();
    expect(kpis.auroc).toBeNull();
  });

  it("reads precision_at_50 and auroc from metrics", () => {
    const metrics: MetricsRow = { precision_at_50: 0.68, auroc: 0.90 };
    const { p50, auroc } = deriveMetricKpis(metrics);
    expect(p50).toBe(0.68);
    expect(auroc).toBe(0.90);
  });

  it("falls back to backtest_summary fields when primary fields absent", () => {
    const metrics: MetricsRow = {
      backtest_summary_p_at_50: 0.62,
      backtest_summary_auroc: 0.87,
    };
    const { p50, auroc } = deriveMetricKpis(metrics);
    expect(p50).toBe(0.62);
    expect(auroc).toBe(0.87);
  });
});
