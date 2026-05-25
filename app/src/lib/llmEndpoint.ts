/** Local dev default — Caddy HTTPS proxy from `scripts/run_llama.sh`. */
export const LOCAL_LLM_ENDPOINT = "https://localhost:8443/v1/chat/completions";

/** Persisted opt-in: use local LLM from production / preview hosts on this machine. */
export const LOCAL_LLM_STORAGE_KEY = "arktrace:useLocalLlm";

const LOCAL_LLM_QUERY_KEY = "local_llm";

function readUrlLocalLlmFlag(): boolean {
  if (typeof window === "undefined") return false;
  const v = new URLSearchParams(window.location.search).get(LOCAL_LLM_QUERY_KEY);
  return v === "1" || v === "true";
}

/** True when analyst enabled local LLM for this browser (URL `?local_llm=1` or storage). */
export function isLocalLlmEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (readUrlLocalLlmFlag()) {
    try {
      localStorage.setItem(LOCAL_LLM_STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
    return true;
  }
  try {
    return localStorage.getItem(LOCAL_LLM_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Opt in to `https://localhost:8443` from any arktrace host (same machine as run_llama.sh). */
export function enableLocalLlm(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_LLM_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function disableLocalLlm(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_LLM_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve OpenAI-compatible chat endpoint (testable without import.meta).
 *
 * - `configured` — `VITE_LLM_ENDPOINT` when non-empty.
 * - `dev` — Vite `import.meta.env.DEV`.
 * - `hostname` — `localhost` / `127.0.0.1`.
 * - `useLocalLlm` — explicit opt-in for production (storage or `?local_llm=1`).
 */
export function resolveLlmEndpoint(
  configured: string | undefined,
  dev: boolean,
  hostname?: string,
  useLocalLlm = false
): string | null {
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim();
  }
  if (dev) {
    return LOCAL_LLM_ENDPOINT;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return LOCAL_LLM_ENDPOINT;
  }
  if (useLocalLlm) {
    return LOCAL_LLM_ENDPOINT;
  }
  return null;
}

/**
 * OpenAI-compatible chat endpoint for in-browser brief generation.
 *
 * Production without `VITE_LLM_ENDPOINT` uses local LLM only when opted in
 * (`?local_llm=1` or Analyst brief “Use local LLM” — requires run_llama.sh on this machine).
 */
export function getLlmEndpoint(): string | null {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : undefined;
  return resolveLlmEndpoint(
    import.meta.env.VITE_LLM_ENDPOINT,
    import.meta.env.DEV,
    hostname,
    isLocalLlmEnabled()
  );
}

/** True when endpoint is the default local Caddy proxy. */
export function isLocalLlmEndpoint(endpoint: string | null): boolean {
  if (!endpoint) return false;
  return (
    endpoint.includes("localhost") ||
    endpoint.includes("127.0.0.1") ||
    endpoint === LOCAL_LLM_ENDPOINT
  );
}

/** User-facing hint when brief generation is unavailable. */
export function llmOfflineHint(): string {
  const endpoint = getLlmEndpoint();
  if (!endpoint) {
    return (
      "Analyst brief LLM is not configured. " +
      "Enable local LLM (run_llama.sh on this machine) or set VITE_LLM_ENDPOINT on deploy."
    );
  }
  if (isLocalLlmEndpoint(endpoint)) {
    return "Local LLM offline — start run_llama.sh (Caddy :8443 → llama-server :8080)";
  }
  return "LLM offline";
}
