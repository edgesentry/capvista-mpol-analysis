import { test, expect } from "@playwright/test";
import {
  MOCK_BRIEF,
  collectBinderErrors,
  mockLocalLlm,
  openFixtureVessel,
  seedRegionStorage,
  useFixtureData,
} from "./helpers";

test.describe("Analyst brief — local LLM (Tier 1 mock)", () => {
  test.beforeEach(async ({ page }) => {
    await seedRegionStorage(page);
    await useFixtureData(page);
    await mockLocalLlm(page);
  });

  test("Regenerate shows brief without offline state (dev → localhost:8443)", async ({
    page,
  }) => {
    const binderErrors = collectBinderErrors(page);
    await page.goto("/");
    await openFixtureVessel(page);

    await expect(page.getByText("Generating…")).toBeHidden({ timeout: 60_000 });
    await expect(page.getByText(MOCK_BRIEF)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/LLM offline|not configured/i)).toHaveCount(0);

    await page.getByRole("button", { name: "Regenerate" }).click();
    await expect(page.getByText("Generating…")).toBeVisible();
    await expect(page.getByText(MOCK_BRIEF)).toBeVisible({ timeout: 60_000 });

    expect(binderErrors).toEqual([]);
  });
});
