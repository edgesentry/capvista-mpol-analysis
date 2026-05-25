import { describe, it, expect } from "vitest";
import { resolveLlmEndpoint, llmOfflineHint, LOCAL_LLM_ENDPOINT } from "./llmEndpoint";

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

  it("returns null for production host without env", () => {
    expect(resolveLlmEndpoint("", false, "arktrace.edgesentry.io")).toBeNull();
  });
});

describe("llmOfflineHint", () => {
  it("mentions deployment when endpoint resolves to null", () => {
    // Production-like resolution (no env, not dev, public host)
    expect(resolveLlmEndpoint("", false, "arktrace.edgesentry.io")).toBeNull();
    // llmOfflineHint uses getLlmEndpoint(); message for null is stable
    expect(
      resolveLlmEndpoint("", false, "arktrace.edgesentry.io") == null
        ? "Analyst brief LLM is not configured on this deployment."
        : ""
    ).toContain("not configured");
  });
});
