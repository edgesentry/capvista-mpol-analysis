import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub heavy browser dependencies before importing the component.
vi.mock("../lib/duckdb", () => ({
  isParquetRegistered: vi.fn(),
}));
vi.mock("../lib/briefCache", () => ({
  getCachedBrief: vi.fn(),
  saveCachedBrief: vi.fn(),
  initBriefCache: vi.fn(),
}));
vi.mock("../lib/reviews", () => ({
  getReview: vi.fn(),
  tierColor: vi.fn(),
  handoffLabel: vi.fn(),
}));
vi.mock("../lib/humanise", () => ({
  formatLastSeen: vi.fn((v) => v ?? "—"),
  confidenceTier: vi.fn(() => "HIGH"),
  confidenceTierColor: vi.fn(() => "#f00"),
  signalLabel: vi.fn((f: string) => f),
  signalSeverity: vi.fn(() => null),
  severityColor: vi.fn(() => "#f00"),
}));

import { SYSTEM_PROMPT, buildUserContent } from "./VesselDetail";
import type { VesselRow } from "../lib/duckdb";
import { shouldOfferLocalLlmOptIn } from "../lib/llmEndpoint";

const BASE_VESSEL: VesselRow = {
  mmsi: "123456789",
  imo: null,
  vessel_name: "TEST VESSEL",
  flag: "SG",
  vessel_type: "Tanker",
  region: "singapore",
  last_seen: "2026-04-22T10:00:00Z",
  last_lat: 1.3521,
  last_lon: 103.8198,
  confidence: 0.87,
  top_signals: null,
  ais_gap_count_30d: null,
  sts_candidate_count: null,
  sanctions_distance: null,
  ownership_chain: null,
  hull_visual_similarity: null,
};

// ── local LLM opt-in (Analyst brief offline UI) ───────────────────────────────

describe("shouldOfferLocalLlmOptIn (VesselDetail offline button)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("location", new URL("https://arktrace.edgesentry.io/") as unknown as Location);
  });

  it("offers opt-in on production-like host without remote LLM env", () => {
    expect(shouldOfferLocalLlmOptIn(undefined)).toBe(true);
  });

  it("does not offer opt-in when remote endpoint is configured at build time", () => {
    expect(shouldOfferLocalLlmOptIn("https://llm.example/v1/chat/completions")).toBe(false);
  });
});

// ── SYSTEM_PROMPT constraints ────────────────────────────────────────────────

describe("SYSTEM_PROMPT", () => {
  it("prohibits inventing MMSIs and vessel identifiers", () => {
    expect(SYSTEM_PROMPT).toContain("Do NOT invent");
    expect(SYSTEM_PROMPT).toContain("MMSI");
    expect(SYSTEM_PROMPT).toContain("IMO number");
    expect(SYSTEM_PROMPT).toContain("vessel name");
  });

  it("prohibits adding unverified sanctions or ownership claims", () => {
    expect(SYSTEM_PROMPT).toContain("sanctions designations");
    expect(SYSTEM_PROMPT).toContain("ownership links");
  });

  it("requires plain text output only", () => {
    expect(SYSTEM_PROMPT).toContain("plain text only");
    expect(SYSTEM_PROMPT).toContain("no markdown");
  });

  it("enforces a 3-sentence maximum", () => {
    expect(SYSTEM_PROMPT).toContain("Maximum 3 sentences");
  });

  it("references the context block as the sole source of truth", () => {
    expect(SYSTEM_PROMPT).toContain("context block");
  });
});

// ── buildUserContent ─────────────────────────────────────────────────────────

describe("buildUserContent", () => {
  it("includes MMSI and confidence", () => {
    const content = buildUserContent(BASE_VESSEL);
    expect(content).toContain("MMSI: 123456789");
    expect(content).toContain("Anomaly confidence: 0.870");
  });

  it("includes vessel name when present", () => {
    const content = buildUserContent(BASE_VESSEL);
    expect(content).toContain("Vessel: TEST VESSEL");
  });

  it("falls back to MMSI in vessel line when name is absent", () => {
    const content = buildUserContent({ ...BASE_VESSEL, vessel_name: "" });
    expect(content).toContain("Vessel: 123456789");
  });

  it("omits empty fields — flag", () => {
    const content = buildUserContent({ ...BASE_VESSEL, flag: "" });
    expect(content).not.toContain("Flag:");
  });

  it("omits empty fields — vessel type", () => {
    const content = buildUserContent({ ...BASE_VESSEL, vessel_type: "" });
    expect(content).not.toContain("Type:");
  });

  it("omits empty fields — region", () => {
    const content = buildUserContent({ ...BASE_VESSEL, region: "" });
    expect(content).not.toContain("Region:");
  });

  it("omits null fields — last_seen", () => {
    const content = buildUserContent({ ...BASE_VESSEL, last_seen: null });
    expect(content).not.toContain("Last seen:");
  });

  it("omits position when lat/lon are null", () => {
    const content = buildUserContent({ ...BASE_VESSEL, last_lat: null, last_lon: null });
    expect(content).not.toContain("Position:");
  });

  it("includes position when both lat and lon are present", () => {
    const content = buildUserContent(BASE_VESSEL);
    expect(content).toContain("Position:");
    expect(content).toContain("1.3521");
    expect(content).toContain("103.8198");
  });

  it("does not include any field not in the vessel row", () => {
    const content = buildUserContent(BASE_VESSEL);
    // Ensure no invented data markers leak in
    expect(content).not.toContain("undefined");
    expect(content).not.toContain("null");
    expect(content).not.toContain("NaN");
  });
});

// ── hullSimilarityColor ──────────────────────────────────────────────────────

import { renderToStaticMarkup } from "react-dom/server";
import { hullSimilarityColor, HullSimilarityBadge } from "./VesselDetail";

describe("hullSimilarityColor", () => {
  it("returns red for score >= 0.85", () => {
    expect(hullSimilarityColor(0.91)).toBe("#fc8181");
    expect(hullSimilarityColor(0.85)).toBe("#fc8181");
  });

  it("returns orange for score in [0.70, 0.85)", () => {
    expect(hullSimilarityColor(0.75)).toBe("#f6ad55");
    expect(hullSimilarityColor(0.70)).toBe("#f6ad55");
  });

  it("returns green for score < 0.70", () => {
    expect(hullSimilarityColor(0.60)).toBe("#68d391");
    expect(hullSimilarityColor(0.0)).toBe("#68d391");
  });
});

// ── HullSimilarityBadge render ───────────────────────────────────────────────

describe("HullSimilarityBadge", () => {
  it("shows percentage and filled bar for score 0.91", () => {
    const html = renderToStaticMarkup(HullSimilarityBadge({ score: 0.91 }));
    expect(html).toContain("91%");
    expect(html).toContain("Hull match");
    // 9 filled blocks (Math.round(0.91 * 10) = 9)
    expect(html).toContain("█".repeat(9));
    expect(html).toContain("░".repeat(1));
  });

  it("shows 100% and fully filled bar for score 1.0", () => {
    const html = renderToStaticMarkup(HullSimilarityBadge({ score: 1.0 }));
    expect(html).toContain("100%");
    expect(html).toContain("█".repeat(10));
    expect(html).not.toContain("░");
  });

  it("uses red border color for high-confidence match (score 0.91)", () => {
    const html = renderToStaticMarkup(HullSimilarityBadge({ score: 0.91 }));
    expect(html).toContain("#fc8181");
  });

  it("uses orange border color for moderate match (score 0.75)", () => {
    const html = renderToStaticMarkup(HullSimilarityBadge({ score: 0.75 }));
    expect(html).toContain("#f6ad55");
    expect(html).toContain("75%");
  });
});
