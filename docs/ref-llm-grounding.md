# LLM Grounding and Anti-Hallucination Policy

arktrace uses a local LLM exclusively for **text synthesis** — converting pre-computed, deterministic scores into plain-language patrol briefs. The LLM has no access to external data, cannot modify scores, and cannot query the pipeline.

---

## Two-Phase Architecture

```
Phase 1 — Deterministic scoring  (no LLM)
  AIS positions → feature engineering → DiD causal model → SHAP attribution
  Output: confidence score, ATT ± CI, top_signals JSON, ownership graph path
          ↓  immutable — passed as read-only context to Phase 2

Phase 2 — Bounded text synthesis  (LLM)
  Context block (vessel metadata + Phase 1 outputs) → system prompt + user prompt
  Output: 2-3 sentence plain-language brief
```

The LLM only sees what Phase 1 produces. It cannot alter scores, fetch external data, or access any information outside the context block.

---

## System Prompt

Injected as `role: "system"` on every brief request:

```
You are a maritime intelligence analyst writing patrol dispatch briefs.
You will be given a structured vessel context block containing pre-computed scores,
SHAP signal attributions, and verified registry data. Your only job is to synthesise
that context into a concise plain-language brief.

STRICT CONSTRAINTS — violation invalidates the brief:
- Do NOT invent, infer, or guess any MMSI, IMO number, vessel name, flag, owner,
  or position not present in the context block.
- Do NOT add sanctions designations, ownership links, or cargo claims not stated
  in the context block.
- Do NOT speculate about intent beyond what the provided signals support.
- Every factual claim must be traceable to a field in the context block.
- Output plain text only — no markdown, no bullet points, no headers.
- Maximum 3 sentences.
```

---

## User Prompt (context block)

Injected as `role: "user"`. Contains only fields present in the scored vessel row:

```
Write a 2-3 sentence risk assessment for the vessel below.
Focus on probable cause of the anomaly, regional context, and recommended follow-up action.
Only reference data present in the context block below.

Vessel: <vessel_name or mmsi>
MMSI: <mmsi>
Flag: <flag>               ← omitted if null
Type: <vessel_type>        ← omitted if null
Region: <region>           ← omitted if null
Last seen: <last_seen>     ← omitted if null
Position: <lat>°, <lon>°   ← omitted if null
Anomaly confidence: <confidence>
```

No SHAP signal values, ownership paths, or ATT coefficients are included in the user prompt at this stage — the brief is intentionally scoped to vessel-level summary. The full signal breakdown is in the **Feature attribution** panel; ownership hops are in the separate **Ownership chain** panel (from the `ownership_chain` watchlist column), not in the LLM context block.

---

## Output Constraints

| Parameter | Value | Rationale |
|---|---|---|
| `max_tokens` | 200 | Hard ceiling — prevents rambling or invented detail |
| `temperature` | 0.3 | Low variance — reproducible, factual tone |
| Output format | Plain text, ≤ 3 sentences | No markdown structures that could embed unverified claims |

---

## What the LLM Cannot Do

| Prohibited action | Enforced by |
|---|---|
| Invent MMSIs, IMO numbers, or vessel names | System prompt constraint + context block contains only verified registry fields |
| Add sanctions designations not in the context | System prompt constraint; sanctions data is displayed from the deterministic pipeline, not the brief |
| Modify the confidence score or ATT estimate | LLM output is stored in `analyst_briefs` table; scores are stored separately and never overwritten by brief generation |
| Access external APIs or the internet | Local inference endpoint only (`localhost`); no outbound network access from the LLM process |
| Persist state between requests | Stateless API call; no conversation history is maintained |

---

## Verifiability

Every claim in an analyst brief can be verified against the displayed SHAP panel and vessel detail row. The brief is clearly labelled "Analyst brief" and visually separated from the deterministic SHAP attribution and ATT outputs. Analysts are instructed in the [SOP](https://edgesentry.github.io/indago/sop/) to treat the brief as a synthesis aid, not a primary evidence source.

---

## Local LLM setup (`run_llama.sh`)

| Component | URL |
|---|---|
| llama-server | `http://localhost:8080/v1` |
| Caddy (HTTPS + CORS) | `https://localhost:8443/v1` |

```bash
cd arktrace && bash scripts/run_llama.sh
curl -sk https://localhost:8443/v1/models | head -c 200
```

Production SPA: open `https://arktrace.edgesentry.io?local_llm=1` or click **Use local LLM** on the Analyst brief panel (same machine as `run_llama.sh`).

### Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `ERR_CONNECTION_REFUSED` on `:8443` | Caddy not running | Restart `run_llama.sh`; check `/tmp/caddy-llama.log` |
| CORS: duplicate `Access-Control-Allow-Origin` | Caddy + llama both emit CORS | Use current `scripts/caddy/local-llm.caddy.in` (strips upstream headers) |
| `ERR_CERT_DATE_INVALID` / TLS blocked | Caddy local CA not trusted | Visit `https://localhost:8443/v1/models` once and accept cert (Safari) |
| Brief shows “not configured” on production | No `VITE_LLM_ENDPOINT` and no opt-in | `?local_llm=1` or **Use local LLM** |
| `Binder Error: mmsi` in console | R2 `causal_effects.parquet` regime-only stub | Harmless for brief; guarded in `duckdb.ts` (#588) |

---

## E2E tests (Playwright)

CI runs **Tier 1** mock-LLM tests (no GGUF download):

```bash
cd arktrace/app
npm ci
uv run python ../scripts/gen_e2e_causal_stub.py   # regime-only causal fixture
npm run test:e2e:install
npm run test:e2e
```

| Tier | Command | Notes |
|---|---|---|
| **1 — CI** | `npm run test:e2e` | Mocks `https://localhost:8443/v1/chat/completions`; fixtures via `VITE_MANIFEST_URL` |
| **2 — Manual / nightly** | `run_llama.sh` + dev SPA | Real inference; MMSI `352179000` per Cap Vista [#63](https://github.com/edgesentry/edgesentry-commercial/issues/63) |
| **3 — Preview opt-in** | `analyst-brief-preview.spec.ts` | Production build + **Use local LLM** + mock |

Tracked in [arktrace#589](https://github.com/edgesentry/arktrace/issues/589).
