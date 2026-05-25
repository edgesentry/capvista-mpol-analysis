#!/usr/bin/env python3
"""Write regime-only causal_effects stub for Playwright E2E (no mmsi column)."""

from pathlib import Path

import polars as pl

OUT = Path(__file__).resolve().parents[1] / "app/public/fixtures/causal_effects_regime_only.parquet"

SCHEMA = {
    "regime": pl.Utf8,
    "label": pl.Utf8,
    "n_treated": pl.Int32,
    "n_control": pl.Int32,
    "att_estimate": pl.Float64,
    "att_ci_lower": pl.Float64,
    "att_ci_upper": pl.Float64,
    "p_value": pl.Float64,
    "is_significant": pl.Boolean,
    "calibrated_weight": pl.Float64,
}

if __name__ == "__main__":
    df = pl.DataFrame(
        {
            "regime": ["singapore"],
            "label": ["stub"],
            "n_treated": [0],
            "n_control": [0],
            "att_estimate": [0.0],
            "att_ci_lower": [0.0],
            "att_ci_upper": [0.0],
            "p_value": [1.0],
            "is_significant": [False],
            "calibrated_weight": [0.0],
        },
        schema=SCHEMA,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.write_parquet(OUT)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
