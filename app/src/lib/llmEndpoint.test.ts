import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveLlmEndpoint,
  LOCAL_LLM_ENDPOINT,
  LOCAL_LLM_STORAGE_KEY,
  isLocalLlmEnabled,
  enableLocalLlm,
  disableLocalLlm,
  shouldOfferLocalLlmOptIn,
  isLocalLlmEndpoint,
  getLlmEndpoint,
  llmOfflineHint,
} from "./llmEndpoint";

function setLocation(url: string) {
  const parsed = new URL(url);
  vi.stubGlobal("location", {
    hostname: parsed.hostname,
    search: parsed.search,
    href: parsed.href,
    origin: parsed.origin,
    protocol: parsed.protocol,
    host: parsed.host,
    pathname: parsed.pathname,
  } as Location);
}

/** Vitest runs with import.meta.env.DEV true — stub production for getLlmEndpoint tests. */
function stubProductionEnv() {
  vi.stubEnv("MODE", "production");
  vi.stubEnv("PROD", "true");
  vi.stubEnv("DEV", "");
  vi.stubEnv("VITE_LLM_ENDPOINT", "");
}

describe("resolveLlmEndpoint", () => {
  it("returns configured URL when set", () => {
    expect(resolveLlmEndpoint("https://llm.example/v1/chat/completions", false)).toBe(
      "https://llm.example/v1/chat/completions"
    );
  });

  it("returns local default in Vite dev when env unset", () => {
    expect(resolveLlmEndpoint("", true)).toBe(LOCAL_LLM_ENDPOINT);
  });

  it("returns local default for localhost hostname without env", () => {
    expect(resolveLlmEndpoint(undefined, false, "localhost")).toBe(LOCAL_LLM_ENDPOINT);
  });

  it("returns local default when useLocalLlm opt-in on production host", () => {
    expect(resolveLlmEndpoint("", false, "arktrace.edgesentry.io", true)).toBe(
      LOCAL_LLM_ENDPOINT
    );
  });

  it("returns null for production host without env or opt-in", () => {
    expect(resolveLlmEndpoint("", false, "arktrace.edgesentry.io")).toBeNull();
  });
});

describe("isLocalLlmEnabled", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocation("https://arktrace.edgesentry.io/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false when storage empty and no query param", () => {
    expect(isLocalLlmEnabled()).toBe(false);
  });

  it("is true and persists when ?local_llm=1", () => {
    setLocation("https://arktrace.edgesentry.io/?local_llm=1");
    expect(isLocalLlmEnabled()).toBe(true);
    expect(localStorage.getItem(LOCAL_LLM_STORAGE_KEY)).toBe("1");
    setLocation("https://arktrace.edgesentry.io/");
    expect(isLocalLlmEnabled()).toBe(true);
  });

  it("is true when ?local_llm=true", () => {
    setLocation("https://arktrace.edgesentry.io/watchlist?local_llm=true");
    expect(isLocalLlmEnabled()).toBe(true);
  });

  it("is false for unrelated query values", () => {
    setLocation("https://arktrace.edgesentry.io/?local_llm=0");
    expect(isLocalLlmEnabled()).toBe(false);
  });

  it("reads storage set by enableLocalLlm", () => {
    enableLocalLlm();
    expect(isLocalLlmEnabled()).toBe(true);
  });

  it("is false after disableLocalLlm", () => {
    enableLocalLlm();
    disableLocalLlm();
    expect(isLocalLlmEnabled()).toBe(false);
    expect(localStorage.getItem(LOCAL_LLM_STORAGE_KEY)).toBeNull();
  });
});

describe("shouldOfferLocalLlmOptIn", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocation("https://arktrace.edgesentry.io/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is true without remote endpoint and without opt-in", () => {
    expect(shouldOfferLocalLlmOptIn(undefined)).toBe(true);
    expect(shouldOfferLocalLlmOptIn("")).toBe(true);
  });

  it("is false when remote endpoint is configured", () => {
    expect(shouldOfferLocalLlmOptIn("https://llm.example/v1/chat/completions")).toBe(
      false
    );
  });

  it("is false after user opts in", () => {
    enableLocalLlm();
    expect(shouldOfferLocalLlmOptIn(undefined)).toBe(false);
  });
});

describe("isLocalLlmEndpoint", () => {
  it("detects localhost URLs", () => {
    expect(isLocalLlmEndpoint(LOCAL_LLM_ENDPOINT)).toBe(true);
    expect(isLocalLlmEndpoint("https://llm.example/v1/chat/completions")).toBe(false);
    expect(isLocalLlmEndpoint(null)).toBe(false);
  });
});

describe("getLlmEndpoint", () => {
  beforeEach(() => {
    localStorage.clear();
    stubProductionEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns null on production host without opt-in", () => {
    setLocation("https://arktrace.edgesentry.io/");
    expect(getLlmEndpoint()).toBeNull();
  });

  it("returns local endpoint on production host after opt-in", () => {
    setLocation("https://arktrace.edgesentry.io/?local_llm=1");
    expect(getLlmEndpoint()).toBe(LOCAL_LLM_ENDPOINT);
  });

  it("prefers VITE_LLM_ENDPOINT over opt-in", () => {
    vi.stubEnv("VITE_LLM_ENDPOINT", "https://remote.example/v1/chat/completions");
    setLocation("https://arktrace.edgesentry.io/?local_llm=1");
    expect(getLlmEndpoint()).toBe("https://remote.example/v1/chat/completions");
  });
});

describe("llmOfflineHint", () => {
  beforeEach(() => {
    localStorage.clear();
    stubProductionEnv();
    setLocation("https://arktrace.edgesentry.io/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("mentions not configured when no endpoint", () => {
    expect(llmOfflineHint()).toContain("not configured");
  });

  it("mentions run_llama when local endpoint is enabled but unreachable", () => {
    enableLocalLlm();
    expect(llmOfflineHint()).toContain("run_llama.sh");
  });
});
