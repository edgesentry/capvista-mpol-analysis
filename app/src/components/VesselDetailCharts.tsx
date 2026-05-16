import {
  normalizeAttributions,
  parseOwnershipChain,
  parseSignals,
  formatSanctionsDistance,
  ownershipChainEmptyMessage,
  ownershipRelationLabel,
  signalLabel,
  signalSeverity,
  severityColor,
} from "../lib/vesselDetailUtils";

export function FeatureAttributionChart({ raw }: { raw: string | null | undefined }) {
  const rows = normalizeAttributions(parseSignals(raw));
  if (!rows.length) return null;

  return (
    <div style={{ marginTop: "0.75rem" }} data-testid="feature-attribution">
      <div
        style={{
          fontSize: "0.65rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#4a5568",
          marginBottom: "0.4rem",
        }}
      >
        Feature attribution
      </div>
      {rows.map((s) => {
        const pct = s.sharePct;
        const label = signalLabel(s.feature);
        const rawVal = s.value != null ? String(s.value) : "—";
        const sev = signalSeverity(s.feature, s.value);
        return (
          <div
            key={s.feature}
            title={`${s.feature}: ${rawVal}`}
            style={{ marginBottom: "0.35rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.15rem" }}>
              <span style={{ fontSize: "0.65rem", color: "#a0aec0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {label}
              </span>
              {sev && (
                <span style={{ fontSize: "0.55rem", fontWeight: 700, color: severityColor(sev), border: `1px solid ${severityColor(sev)}`, borderRadius: 2, padding: "0 0.25rem", flexShrink: 0, fontFamily: "ui-monospace,monospace" }}>
                  {sev}
                </span>
              )}
              <span style={{ fontSize: "0.65rem", color: "#718096", flexShrink: 0, fontFamily: "ui-monospace,monospace" }}>
                {rawVal}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ flex: 1, background: "#1a1f2e", borderRadius: 2, height: 6, minWidth: 0 }}>
                <div style={{ width: `${pct}%`, background: sev ? severityColor(sev) : "#fc8181", height: "100%", borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: "0.6rem", color: "#cbd5e0", minWidth: 32, textAlign: "right", fontFamily: "ui-monospace,monospace" }}>
                {pct.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OwnershipChainPanel({
  chainRaw,
  sanctionsDistance,
  vesselName,
  mmsi,
}: {
  chainRaw: string | null | undefined;
  sanctionsDistance: number | null | undefined;
  vesselName: string;
  mmsi: string;
}) {
  const chain = parseOwnershipChain(chainRaw);
  const hasChain = chain.length > 1 || (chain.length === 1 && chain[0]?.sanctioned);

  return (
    <div style={{ marginTop: "0.75rem" }} data-testid="ownership-chain">
      <div
        style={{
          fontSize: "0.65rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#4a5568",
          marginBottom: "0.4rem",
        }}
      >
        Ownership chain
      </div>
      {sanctionsDistance != null && (
        <div style={{ fontSize: "0.68rem", color: "#718096", marginBottom: "0.45rem" }}>
          {formatSanctionsDistance(sanctionsDistance)}
        </div>
      )}
      {!hasChain ? (
        <div style={{ fontSize: "0.68rem", color: "#4a5568", fontStyle: "italic" }}>
          {ownershipChainEmptyMessage(sanctionsDistance)}
        </div>
      ) : (
        <div style={{ fontSize: "0.72rem", color: "#cbd5e0", lineHeight: 1.55 }}>
          {chain.map((hop, idx) => {
            const indent = idx * 14;
            const isRoot = idx === 0;
            const prefix = isRoot ? "" : "└── ";
            const rel = ownershipRelationLabel(hop.relation, hop.kind);
            const country = hop.country ? ` (${hop.country})` : "";
            const sanctioned = hop.sanctioned || hop.kind === "sanction";
            const displayName = isRoot
              ? `${hop.name || vesselName} (MMSI ${mmsi})`
              : `${rel}: ${hop.name}${country}`;
            return (
              <div
                key={`${hop.hop}-${hop.name}-${idx}`}
                style={{
                  marginLeft: indent,
                  marginBottom: idx < chain.length - 1 ? "0.2rem" : 0,
                  color: sanctioned ? "#fc8181" : "#cbd5e0",
                }}
              >
                <span style={{ color: "#4a5568" }}>{prefix}</span>
                {displayName}
                {sanctioned && hop.kind !== "sanction" && (
                  <span style={{ marginLeft: "0.35rem", fontSize: "0.6rem", fontWeight: 700 }}>⚠ SANCTIONED</span>
                )}
                {hop.kind === "sanction" && (
                  <span style={{ marginLeft: "0.35rem", fontSize: "0.6rem", fontWeight: 700 }}>→ listing</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
