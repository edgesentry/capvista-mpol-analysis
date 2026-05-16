import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FeatureAttributionChart, OwnershipChainPanel } from "./VesselDetailCharts";

describe("FeatureAttributionChart", () => {
  it("renders attribution section with share percentages", () => {
    const raw = JSON.stringify([
      { feature: "ais_gap_count_30d", value: 4, contribution: 0.6 },
      { feature: "sanctions_distance", value: 1, contribution: 0.4 },
    ]);
    const html = renderToStaticMarkup(<FeatureAttributionChart raw={raw} />);
    expect(html).toContain('data-testid="feature-attribution"');
    expect(html).toContain("Feature attribution");
    expect(html).toContain("60%");
    expect(html).toContain("40%");
  });

  it("renders nothing when signals are empty", () => {
    expect(renderToStaticMarkup(<FeatureAttributionChart raw={null} />)).toBe("");
    expect(renderToStaticMarkup(<FeatureAttributionChart raw="[]" />)).toBe("");
  });
});

describe("OwnershipChainPanel", () => {
  it("shows empty state when graph has no ownership links", () => {
    const html = renderToStaticMarkup(
      <OwnershipChainPanel
        chainRaw={JSON.stringify([{ hop: 0, kind: "vessel", name: "TEST", country: "", sanctioned: false }])}
        sanctionsDistance={99}
        vesselName="TEST"
        mmsi="111111111"
      />,
    );
    expect(html).toContain("No ownership records in graph for this vessel.");
    expect(html).toContain("No sanctions link in ownership graph");
  });

  it("shows registry message when directly sanctioned but chain is empty", () => {
    const html = renderToStaticMarkup(
      <OwnershipChainPanel
        chainRaw={null}
        sanctionsDistance={0}
        vesselName="DOBRYNYA"
        mmsi="273449240"
      />,
    );
    expect(html).toContain("Directly sanctioned entity");
    expect(html).toContain("sanctions registry");
    expect(html).not.toContain("No ownership records in graph for this vessel.");
  });

  it("renders single-hop sanctioned vessel chain", () => {
    const html = renderToStaticMarkup(
      <OwnershipChainPanel
        chainRaw={JSON.stringify([
          { hop: 0, kind: "vessel", name: "DOBRYNYA", country: "", sanctioned: true, relation: "vessel" },
        ])}
        sanctionsDistance={0}
        vesselName="DOBRYNYA"
        mmsi="273449240"
      />,
    );
    expect(html).toContain("MMSI 273449240");
    expect(html).not.toContain("sanctions registry");
  });

  it("renders operator and sanctions listing hops", () => {
    const chain = [
      { hop: 0, kind: "vessel", name: "ADMIRAL STAR", country: "", sanctioned: false },
      { hop: 1, kind: "company", name: "Seawind Ltd", country: "PA", sanctioned: false, relation: "operator" },
      { hop: 2, kind: "sanction", name: "OFAC SDN (2024-11-12)", country: "", sanctioned: true, relation: "sanctioned_by" },
    ];
    const html = renderToStaticMarkup(
      <OwnershipChainPanel
        chainRaw={JSON.stringify(chain)}
        sanctionsDistance={1}
        vesselName="ADMIRAL STAR"
        mmsi="613490000"
      />,
    );
    expect(html).toContain('data-testid="ownership-chain"');
    expect(html).toContain("Operator: Seawind Ltd (PA)");
    expect(html).toContain("MMSI 613490000");
    expect(html).toContain("1 hop");
    expect(html).toContain("→ listing");
  });
});
