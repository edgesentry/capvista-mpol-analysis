# Ownership chain panel (arktrace UI)

## What it shows

The vessel detail **Ownership chain** panel renders the watchlist column `ownership_chain`: a JSON array of hops (`vessel` → `company` → optional `sanction` listing) materialised at publish time in **indago**. It is **explainability only** — composite `confidence` is computed earlier from graph features (`sanctions_distance`, `graph_risk_score`, etc.), not from this JSON.

| `sanctions_distance` (subtitle) | Typical chain depth |
|--------------------------------|---------------------|
| 0 | Often one vessel node (directly designated) |
| 1–2 | Vessel + operator and/or listing hops when graph edges exist |
| 99 | Usually empty or single vessel node |

Do not assume a fixed MMSI will always show multi-hop paths; use the inspection workflow below after each data-publish.

## Data path

```
indago: config/equasis/ownership_seed.csv
     → equasis_ownership → vessel_registry (--equasis-csv)
     → Lance graph (MANAGED_BY / OWNED_BY / …)
     → knowledge_graph → ownership_chain on watchlist Parquet
     → R2 arktrace-public/score/{region}_watchlist.parquet
arktrace: DuckDB-WASM reads Parquet → VesselDetail Ownership chain panel
```

See [indago `config/equasis/README.md`](https://github.com/edgesentry/indago/blob/main/config/equasis/README.md) and [ref-knowledge-graph.md](https://github.com/edgesentry/indago/blob/main/docs/ref-knowledge-graph.md).

## Verify before demo or submission video

1. Run a fresh **indago data-publish** on `main` (or confirm the latest Actions run succeeded).
2. On the demo machine: clear site storage / OPFS for arktrace, reload, **Sync** region data.
3. From **indago** repo root, pick a candidate vessel (do not hardcode MMSI in runbooks):

```bash
uv run python .agents/skills/indago-inspect-watchlist/scripts/inspect_watchlist.py \
  --min-chain-hops 2 --limit 20
uv run python .agents/skills/indago-inspect-watchlist/scripts/inspect_watchlist.py --mmsi <MMSI from output>
```

4. Open the same MMSI on [arktrace.edgesentry.io](https://arktrace.edgesentry.io) and confirm the panel matches the JSON.

**UI vs metrics:** A vessel can show `graph_risk_score` in Feature attribution while `ownership_chain` is still empty if the publish predates Equasis seed edges or OPFS is stale — fix data-publish and cache, not the scorer alone.

## Related

- [ui-personas.md](ui-personas.md) — analyst journey step “Check ownership”
- [ref-llm-grounding.md](ref-llm-grounding.md) — LLM brief does not replace this panel
- [AGENTS.md](https://github.com/edgesentry/arktrace/blob/main/AGENTS.md) — troubleshooting empty `ownership_chain`
