/**
 * /admin — arktrace detection quality dashboard (operator-only, not analyst-facing)
 *
 * Shows proof that arktrace is working correctly:
 *   - Detection accuracy (AUROC, P@50, Recall from validation_metrics.parquet)
 *   - Watchlist health (total, by region, high-confidence %, unreviewed)
 *   - Causal model coverage (significant vessel count)
 */
import { useEffect, useState } from "react";
import { initDuckDB, queryMetrics, queryWatchlist } from "../lib/duckdb";
import type { MetricsRow } from "../lib/duckdb";
import { syncAndLoad } from "../lib/opfs";
import type { SyncStatus } from "../lib/opfs";
import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { getBulkReviewStates } from "../lib/reviews";
import { loadConfig } from "../lib/config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminMetrics {
  auroc: number | null;
  p50: number | null;
  recall: number | null;
  modelVersion: string | null;
  totalCandidates: number;
  highConfidence: number;
  byRegion: { region: string; count: number; highCount: number }[];
  significantCausal: number;
  unreviewed: number;
  watchlistUpdatedAt: string | null;
}

// ---------------------------------------------------------------------------
// Pure derivation helpers (exported for tests)
// ---------------------------------------------------------------------------

export function deriveWatchlistHealth(
  vessels: Awaited<ReturnType<typeof queryWatchlist>>
) {
  const highConfidence = vessels.filter((v) => v.confidence >= 0.75).length;
  const regionMap = new Map<string, { count: number; highCount: number }>();
  for (const v of vessels) {
    const r = v.region ?? "unknown";
    if (!regionMap.has(r)) regionMap.set(r, { count: 0, highCount: 0 });
    const entry = regionMap.get(r)!;
    entry.count++;
    if (v.confidence >= 0.75) entry.highCount++;
  }
  const byRegion = [...regionMap.entries()]
    .map(([region, { count, highCount }]) => ({ region, count, highCount }))
    .sort((a, b) => b.count - a.count);
  return { highConfidence, byRegion };
}

export function normaliseMetricFields(metrics: MetricsRow | null) {
  return {
    p50:
      (metrics?.backtest_p_at_50 as number | null) ??
      (metrics?.precision_at_50 as number | null) ??
      (metrics?.backtest_summary_p_at_50 as number | null) ??
      null,
    auroc:
      (metrics?.backtest_auroc as number | null) ??
      (metrics?.auroc as number | null) ??
      (metrics?.backtest_summary_auroc as number | null) ??
      null,
    recall:
      (metrics?.backtest_recall_at_200 as number | null) ??
      (metrics?.recall_at_200 as number | null) ??
      null,
    modelVersion: (metrics?.model_version as string | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Data queries
// ---------------------------------------------------------------------------

async function queryAdminMetrics(
  conn: AsyncDuckDBConnection,
  vessels: Awaited<ReturnType<typeof queryWatchlist>>
): Promise<AdminMetrics> {
  const metrics = await queryMetrics(conn);

  const { highConfidence, byRegion } = deriveWatchlistHealth(vessels);

  // Causal effects — significant vessel count
  let significantCausal = 0;
  try {
    const result = await conn.query(
      `SELECT COUNT(*) AS n FROM read_parquet('causal_effects.parquet') WHERE is_significant = true`
    );
    significantCausal = Number(result.toArray()[0]?.toJSON().n ?? 0);
  } catch { /* table absent */ }

  // Unreviewed — vessels with no review decision
  const reviewStates = await getBulkReviewStates(conn, vessels.map((v) => v.mmsi));
  const unreviewed = vessels.filter(
    (v) => !reviewStates.get(v.mmsi)?.decision_tier
  ).length;

  // Watchlist freshness from last_seen
  const lastSeenDates = vessels.map((v) => v.last_seen).filter(Boolean).sort();
  const watchlistUpdatedAt = lastSeenDates.at(-1) ?? null;

  const { p50, auroc, recall, modelVersion } = normaliseMetricFields(metrics);

  return {
    auroc,
    p50,
    recall,
    modelVersion,
    totalCandidates: vessels.length,
    highConfidence,
    byRegion,
    significantCausal,
    unreviewed,
    watchlistUpdatedAt,
  };
}

// ---------------------------------------------------------------------------
// UI components
// ---------------------------------------------------------------------------

const S = {
  page: {
    background: "#0f1117",
    color: "#c9d1d9",
    minHeight: "100vh",
    padding: "2rem",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "baseline",
    gap: "1rem",
    marginBottom: "0.5rem",
    borderBottom: "1px solid #21262d",
    paddingBottom: "1rem",
  } as React.CSSProperties,
  section: { marginBottom: "2rem" } as React.CSSProperties,
  sectionTitle: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#8b949e",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: "0.75rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "1rem",
  } as React.CSSProperties,
  card: {
    background: "#161b22",
    border: "1px solid #21262d",
    borderRadius: "6px",
    padding: "0.9rem 1.1rem",
  } as React.CSSProperties,
  label: { fontSize: "0.7rem", color: "#8b949e", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  value: { fontSize: "1.8rem", fontWeight: 700, color: "#e6edf3", letterSpacing: "-0.02em", marginTop: "0.1rem" },
  sub: { fontSize: "0.7rem", color: "#8b949e", marginTop: "0.15rem" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.8rem" },
  th: { textAlign: "left" as const, color: "#8b949e", fontWeight: 600, borderBottom: "1px solid #21262d", padding: "0.3rem 0.5rem" },
  td: { padding: "0.3rem 0.5rem", borderBottom: "1px solid #161b22" },
  status: { fontSize: "0.75rem", color: "#8b949e", marginBottom: "1.5rem" },
  userLink: {
    fontSize: "0.75rem",
    color: "#8b949e",
    marginBottom: "1.5rem",
    display: "inline-block",
  } as React.CSSProperties,
};

function Kpi({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={S.card}>
      <div style={S.label}>{label}</div>
      <div style={{ ...S.value, color: color ?? "#e6edf3" }}>{value}</div>
      {sub && <div style={S.sub}>{sub}</div>}
    </div>
  );
}

function gateColor(p50: number | null): string {
  if (p50 == null) return "#8b949e";
  return p50 >= 0.25 ? "#3fb950" : "#f85149";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [status, setStatus] = useState("Initialising…");
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [, setSyncStatus] = useState<SyncStatus>({ phase: "idle" });

  useEffect(() => {
    (async () => {
      try {
        setStatus("Loading DuckDB…");
        const { db, conn } = await initDuckDB() as { db: AsyncDuckDB; conn: AsyncDuckDBConnection };

        setStatus("Syncing data from R2…");
        const cfg = await loadConfig().catch(() => null);
        await syncAndLoad(db, setSyncStatus, undefined, false, cfg ?? undefined, undefined);

        setStatus("Querying metrics…");
        const vessels = await queryWatchlist(conn);
        const m = await queryAdminMetrics(conn, vessels);
        setAdminMetrics(m);
        setStatus(`Ready · ${vessels.length} vessels loaded`);
      } catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();
  }, []);

  const m = adminMetrics;
  const p50Color = gateColor(m?.p50 ?? null);
  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#e6edf3" }}>
          arktrace — Admin
        </h1>
        <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>Detection quality · not analyst-facing</span>
      </header>

      <a href="/" style={{ ...S.userLink, color: "#58a6ff", textDecoration: "none" }}>
        ← Analyst dashboard
      </a>

      <div style={S.status}>{status}</div>

      {/* Detection accuracy */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Detection accuracy</div>
        <div style={S.grid}>
          <Kpi
            label="AUROC"
            value={m?.auroc != null ? m.auroc.toFixed(4) : "—"}
            sub="Area under ROC curve"
            color={m?.auroc != null ? (m.auroc >= 0.80 ? "#3fb950" : "#d29922") : undefined}
          />
          <Kpi
            label="Precision @ 50"
            value={m?.p50 != null ? `${(m.p50 * 100).toFixed(1)}%` : "—"}
            sub={m?.p50 != null ? `gate ≥ 25% · ${m.p50 >= 0.25 ? "PASS" : "FAIL"}` : "gate ≥ 25%"}
            color={p50Color}
          />
          <Kpi
            label="Recall @ 200"
            value={m?.recall != null ? m.recall.toFixed(4) : "—"}
            sub="Known positives in top 200"
          />
          <Kpi
            label="Model version"
            value={m?.modelVersion ?? "—"}
          />
        </div>
      </div>

      {/* Watchlist health */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Watchlist health</div>
        <div style={S.grid}>
          <Kpi
            label="Total candidates"
            value={m != null ? String(m.totalCandidates) : "—"}
          />
          <Kpi
            label="High confidence (≥ 0.75)"
            value={m != null ? String(m.highConfidence) : "—"}
            sub={m != null && m.totalCandidates > 0
              ? `${((m.highConfidence / m.totalCandidates) * 100).toFixed(0)}% of watchlist`
              : undefined}
          />
          <Kpi
            label="Causal significant"
            value={m != null ? String(m.significantCausal) : "—"}
            sub="is_significant = true"
          />
          <Kpi
            label="Unreviewed"
            value={m != null ? String(m.unreviewed) : "—"}
            sub="no analyst decision yet"
            color={m != null && m.unreviewed > 20 ? "#d29922" : undefined}
          />
        </div>

        {/* By-region breakdown */}
        {m && m.byRegion.length > 0 && (
          <div style={S.card}>
            <div style={{ ...S.label, marginBottom: "0.5rem" }}>By region</div>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Region</th>
                  <th style={S.th}>Candidates</th>
                  <th style={S.th}>High (≥ 0.75)</th>
                  <th style={S.th}>High %</th>
                </tr>
              </thead>
              <tbody>
                {m.byRegion.map((r) => (
                  <tr key={r.region}>
                    <td style={S.td}>{r.region}</td>
                    <td style={S.td}>{r.count}</td>
                    <td style={S.td}>{r.highCount}</td>
                    <td style={S.td}>
                      {r.count > 0 ? `${((r.highCount / r.count) * 100).toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer style={{ fontSize: "0.7rem", color: "#484f58", borderTop: "1px solid #21262d", paddingTop: "1rem" }}>
        Data: arktrace-public R2 · Admin view — not shown to analysts
      </footer>
    </div>
  );
}
