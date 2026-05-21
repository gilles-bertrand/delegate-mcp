import { describe, it, expect } from "vitest";
import { isRetryable, ProviderError } from "../providers/base.js";

describe("isRetryable", () => {
  it("retries on 429", () => { expect(isRetryable(429)).toBe(true); });
  it("retries on 500", () => { expect(isRetryable(500)).toBe(true); });
  it("retries on 503", () => { expect(isRetryable(503)).toBe(true); });
  it("does not retry on 401", () => { expect(isRetryable(401)).toBe(false); });
  it("does not retry on 403", () => { expect(isRetryable(403)).toBe(false); });
  it("does not retry on 400", () => { expect(isRetryable(400)).toBe(false); });
  it("does not retry on 404", () => { expect(isRetryable(404)).toBe(false); });
});

describe("ProviderError", () => {
  it("is an instance of Error", () => {
    const err = new ProviderError("msg", "glm", true, 429);
    expect(err).toBeInstanceOf(Error);
  });
  it("has name ProviderError", () => {
    const err = new ProviderError("msg", "glm", true);
    expect(err.name).toBe("ProviderError");
  });
  it("stores retryable=true", () => {
    const err = new ProviderError("msg", "glm", true, 429);
    expect(err.retryable).toBe(true);
  });
  it("stores retryable=false", () => {
    const err = new ProviderError("msg", "glm", false, 401);
    expect(err.retryable).toBe(false);
  });
  it("stores providerName", () => {
    const err = new ProviderError("msg", "glm", true);
    expect(err.providerName).toBe("glm");
  });
});
