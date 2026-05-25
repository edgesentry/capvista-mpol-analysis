import type { Page } from "@playwright/test";

export const LOCAL_LLM_CHAT = "https://localhost:8443/v1/chat/completions";
export const MOCK_BRIEF =
  "Mock patrol brief for E2E. Vessel confidence and AIS gaps warrant analyst review in the Singapore Strait corridor.";

/** Fixture watchlist row with confidence above default filter (0.4). */
export const FIXTURE_MMSI = "226855092";
export const FIXTURE_VESSEL_LABEL = "HYDRA 1";

/** Force bundled fixtures (ignore live R2 and stale OPFS from prior local dev). */
export async function useFixtureData(page: Page, manifest = "ducklake_manifest.json"): Promise<void> {
  const manifestPath = `public/fixtures/${manifest}`;

  await page.route(/arktrace-public\.edgesentry\.io/i, (route) => route.abort());

  await page.route(/ducklake_manifest\.json/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      path: manifestPath,
    });
  });

  await page.route(/\.parquet/i, async (route) => {
    const url = route.request().url();
    if (url.includes("/fixtures/")) return route.continue();
    return route.abort();
  });
}

export function seedRegionStorage(page: Page): Promise<void> {
  return page.addInitScript(async () => {
    localStorage.setItem("arktrace.regions", JSON.stringify(["singapore"]));
    localStorage.removeItem("arktrace:useLocalLlm");
    // Fresh OPFS so E2E uses fixture manifest, not a prior R2 sync on localhost.
    try {
      const root = await navigator.storage.getDirectory();
      for await (const [name] of root.entries()) {
        await root.removeEntry(name, { recursive: true });
      }
    } catch {
      /* OPFS unavailable */
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  });
}

/** Mock local LLM (Caddy :8443) with CORS headers for cross-origin SPA. */
export async function mockLocalLlm(page: Page, brief = MOCK_BRIEF): Promise<void> {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  await page.route(LOCAL_LLM_CHAT, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({
        choices: [{ message: { content: brief } }],
      }),
    });
  });

  await page.route("https://localhost:8443/v1/models", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ id: "mock" }] }),
    });
  });
}

export function collectBinderErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("Binder Error") && text.includes("mmsi")) {
      errors.push(text);
    }
  });
  return errors;
}

export async function waitForWatchlistReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    try {
      const root = await navigator.storage.getDirectory();
      for await (const [name] of root.entries()) {
        await root.removeEntry(name, { recursive: true });
      }
    } catch {
      /* ignore */
    }
  });

  const resync = page.getByRole("button", { name: "Re-sync" });
  const syncR2 = page.getByRole("button", { name: "Sync from R2" });
  if (await resync.isVisible().catch(() => false)) {
    await resync.click();
  } else if (await syncR2.isVisible().catch(() => false)) {
    await syncR2.click();
  }

  await page.getByText(/files loaded/i).waitFor({ timeout: 90_000 });
  await page.getByPlaceholder(/Search name/i).fill(FIXTURE_MMSI);
  await page.getByText(FIXTURE_VESSEL_LABEL).first().waitFor({ timeout: 30_000 });
}

export async function openFixtureVessel(page: Page): Promise<void> {
  await waitForWatchlistReady(page);
  await page.getByText(FIXTURE_VESSEL_LABEL).first().click();
  await page.getByText("Analyst brief").waitFor({ timeout: 30_000 });
}
