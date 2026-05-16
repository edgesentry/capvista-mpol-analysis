/**
 * Shared parsers/formatters for VesselDetail charts (feature attribution + ownership chain).
 */

import { signalLabel, signalSeverity, severityColor } from "./humanise";

export interface ShapSignal {
  feature: string;
  value: number | string | null;
  contribution: number;
}

export interface AttributionRow extends ShapSignal {
  sharePct: number;
}

export interface OwnershipHop {
  hop: number;
  kind: string;
  name: string;
  country: string;
  sanctioned: boolean;
  relation?: string;
  date?: string;
}

export function parseSignals(raw: string | null | undefined): ShapSignal[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is ShapSignal =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as ShapSignal).feature === "string" &&
        typeof (s as ShapSignal).contribution === "number"
    );
  } catch {
    return [];
  }
}

/** Normalize positive SHAP contributions to shares that sum to 100%. */
export function normalizeAttributions(signals: ShapSignal[]): AttributionRow[] {
  const positive = signals
    .filter((s) => s.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);
  const total = positive.reduce((sum, s) => sum + s.contribution, 0);
  if (total <= 0) {
    return positive.map((s) => ({ ...s, sharePct: 0 }));
  }
  return positive.map((s) => ({
    ...s,
    sharePct: (s.contribution / total) * 100,
  }));
}

export function parseOwnershipChain(raw: string | null | undefined): OwnershipHop[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (h): h is OwnershipHop =>
        typeof h === "object" &&
        h !== null &&
        typeof (h as OwnershipHop).name === "string"
    );
  } catch {
    return [];
  }
}

export function formatSanctionsDistance(distance: number | null | undefined): string {
  if (distance == null || distance >= 99) return "No sanctions link in ownership graph";
  if (distance === 0) return "Directly sanctioned entity";
  if (distance === 1) return "1 hop — owner or manager on sanctions list";
  return `${distance} hops — parent company linked to sanctions list`;
}

export function ownershipChainEmptyMessage(
  sanctionsDistance: number | null | undefined,
): string {
  if (sanctionsDistance === 0) {
    return "Listed on sanctions registry. No operator or owner edges in the ownership graph for this MMSI.";
  }
  if (sanctionsDistance != null && sanctionsDistance < 99) {
    return "Sanctions link in registry or graph, but no operator or owner path is recorded for this vessel.";
  }
  return "No ownership records in graph for this vessel.";
}

export function ownershipRelationLabel(relation: string | undefined, kind: string): string {
  if (kind === "vessel") return "Vessel";
  if (kind === "sanction") return "Sanctions listing";
  switch (relation) {
    case "operator":
      return "Operator";
    case "manager":
      return "Manager";
    case "controlled_by":
      return "Parent company";
    case "owned_by":
      return "Registered owner";
    default:
      return "Company";
  }
}

export { signalLabel, signalSeverity, severityColor };
