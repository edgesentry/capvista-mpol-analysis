import { test, expect } from "@playwright/test";
import {
  MOCK_BRIEF,
  collectBinderErrors,
  mockLocalLlm,
  openFixtureVessel,
  seedRegionStorage,
  useFixtureData,
} from "./helpers";

test.describe("Analyst brief — production opt-in (Tier 3 mock)", () => {
  test.beforeEach(async ({ page }) => {
    await seedRegionStorage(page);
    await useFixtureData(page);
    await mockLocalLlm(page);
  });

  test("Use local LLM enables brief on preview build", async ({ page }) => {
    const binderErrors = collectBinderErrors(page);
    await page.goto("/");
    await openFixtureVessel(page);

    const optIn = page.getByRole("button", { name: /Use local LLM/i });
    if (await optIn.isVisible().catch(() => false)) {
      await optIn.click();
    }

    await expect(page.getByText("Generating…")).toBeHidden({ timeout: 60_000 });
    await expect(page.getByText(MOCK_BRIEF)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/LLM offline|not configured/i)).toHaveCount(0);
    expect(binderErrors).toEqual([]);
  });
});
