/** Local dev default — Caddy HTTPS proxy from `scripts/run_llama.sh`. */
export const LOCAL_LLM_ENDPOINT = "https://localhost:8443/v1/chat/completions";

/**
 * Resolve OpenAI-compatible chat endpoint (testable without import.meta).
 *
 * - `configured` — `VITE_LLM_ENDPOINT` when non-empty.
 * - `dev` — Vite `import.meta.env.DEV`.
 * - `hostname` — `window.location.hostname` when in browser; omit in SSR/tests.
 */
export function resolveLlmEndpoint(
  configured: string | undefined,
  dev: boolean,
  hostname?: string
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
  return null;
}

/**
 * OpenAI-compatible chat endpoint for in-browser brief generation.
 *
 * Production hosts without `VITE_LLM_ENDPOINT` return `null` (no fetch to localhost).
 */
export function getLlmEndpoint(): string | null {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : undefined;
  return resolveLlmEndpoint(
    import.meta.env.VITE_LLM_ENDPOINT,
    import.meta.env.DEV,
    hostname
  );
}

/** User-facing hint when brief generation is unavailable. */
export function llmOfflineHint(): string {
  const endpoint = getLlmEndpoint();
  if (!endpoint) {
    return "Analyst brief LLM is not configured on this deployment.";
  }
  if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1")) {
    return "Local LLM offline — start run_llama.sh (Caddy :8443 → llama-server :8080)";
  }
  return "LLM offline";
}
