# arktrace

**Shadow fleet analyst dashboard — ranked watchlist, vessel investigation, and patrol handoff.**

**Live app:** [arktrace.edgesentry.io](https://arktrace.edgesentry.io)

---

## What analysts get

- **Ranked watchlist** — vessels scored by causal intent, not anomaly. Each entry shows confidence, region, AIS gap count, and STS transfer candidates.
- **Vessel detail** — Feature attribution (SHAP) and ownership chain panels; AIS track; sanctions graph distance.
- **Patrol brief** — plain-language dispatch summary generated locally in the browser. No score or evidence leaves the site.
- **Review workflow** — triage (Watch / Escalate / Dismiss), handoff status, and review history synced across sessions.
- **Pre-designation lead time** — validates detections against known OFAC designation dates; typical lead: 60–90 days.

## Open the app

```bash
cd app && npm install && npm run dev   # http://localhost:5173
```

Select a region → watchlist loads → click any vessel → feature attribution, ownership chain, and AIS track appear.

Demo data (no pipeline required):

```bash
npx skills add edgesentry/arktrace
/arktrace-demo-data
```

---

## Detection methodology

arktrace applies Difference-in-Differences (DiD) causal modelling to identify vessels whose behaviour changed *because of* a sanction event — not merely anomalous vessels.

| | Anomaly detection (excluded) | arktrace causal inference |
|---|---|---|
| Unit of evaluation | A point — "does this vessel look unusual?" | A line — "did behaviour change *because of* a sanctions event?" |
| False positive driver | Any vessel that deviates | Only vessels whose deviation is statistically linked to a trigger |
| Lead time | Reactive | 60–90 days pre-designation |
| Output | Score + threshold | ATT ± 95% CI, p-value, SHAP signal breakdown |

Scoring is fully deterministic — no LLM in the pipeline. The browser generates patrol briefs via a local LLM with strict grounding constraints; the LLM cannot modify scores. See [docs/ref-llm-grounding.md](docs/ref-llm-grounding.md).

---

## Agent Skills

```bash
npx skills add edgesentry/arktrace
```

## License

Apache-2.0 OR MIT
