import { test, expect } from "@playwright/test";
import {
  collectBinderErrors,
  mockLocalLlm,
  openFixtureVessel,
  seedRegionStorage,
  useFixtureData,
} from "./helpers";

test.describe("causal_effects regime-only stub (#588 regression)", () => {
  test.beforeEach(async ({ page }) => {
    await seedRegionStorage(page);
    await useFixtureData(page, "e2e_ducklake_manifest.json");
    await mockLocalLlm(page);
  });

  test("no DuckDB Binder Error for mmsi on regime-only causal parquet", async ({
    page,
  }) => {
    const binderErrors = collectBinderErrors(page);
    await page.goto("/");
    await openFixtureVessel(page);
    await page.waitForTimeout(2_000);
    expect(binderErrors).toEqual([]);
  });
});
