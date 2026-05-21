import { describe, it, expect, vi } from "vitest";
import { Router } from "../router.js";
import type { RouteRequest } from "../router.js";
import { ProviderError } from "../providers/base.js";
import type { ProviderClient } from "../providers/base.js";
import type { RoutingStrategy } from "../schemas.js";

function makeClient(
  name: string,
  opts?: {
    result?: { text: string; inputTokens: number; outputTokens: number; modelUsed: string };
    error?: Error;
  },
): ProviderClient {
  return {
    name,
    config: {
      models: { default: "test-model" },
      capabilities: ["bulk" as const],
      max_tokens: 1000,
      cost_tier: 1,
      request_timeout_ms: 5000,
      enabled: true,
      base_url: "http://test",
      api_key_env: "TEST_KEY",
      protocol: "openai" as const,
    },
    complete: opts?.error
      ? vi.fn().mockRejectedValue(opts.error)
      : vi.fn().mockResolvedValue(opts?.result ?? {
          text: "ok", inputTokens: 10, outputTokens: 20, modelUsed: "test-model",
        }),
  };
}

function makeStrategy(overrides?: Partial<RoutingStrategy>): RoutingStrategy {
  return {
    bulk: ["glm"],
    long_context: ["glm"],
    reasoning: ["glm"],
    code: ["glm"],
    default: ["glm"],
    failover: true,
    max_failover_attempts: 3,
    ...overrides,
  };
}

describe("Router.route()", () => {
  it("succeeds with a single provider", async () => {
    const registry = new Map([["glm", makeClient("glm")]]);
    const strategy = makeStrategy();
    const router = new Router(registry, strategy);
    const result = await router.route({ taskType: "bulk", userMessage: "test" });
    expect(result.providerName).toBe("glm");
    expect(result.failedProviders).toHaveLength(0);
  });

  it("uses provider hint when valid", async () => {
    const registry = new Map([
      ["glm", makeClient("glm")],
      ["kimi", makeClient("kimi")],
    ]);
    const strategy = makeStrategy({ bulk: ["glm"] });
    const router = new Router(registry, strategy);
    const result = await router.route({ taskType: "bulk", userMessage: "test", providerHint: "kimi" });
    expect(result.providerName).toBe("kimi");
  });

  it("falls back to strategy when provider hint is invalid", async () => {
    const registry = new Map([["glm", makeClient("glm")]]);
    const strategy = makeStrategy({ bulk: ["glm"] });
    const router = new Router(registry, strategy);
    const result = await router.route({ taskType: "bulk", userMessage: "test", providerHint: "nonexistent" });
    expect(result.providerName).toBe("glm");
  });

  it("fails over to next provider on retryable error", async () => {
    const glmError = new ProviderError("rate limited", "glm", true, 429);
    const registry = new Map([
      ["glm", makeClient("glm", { error: glmError })],
      ["kimi", makeClient("kimi")],
    ]);
    const strategy = makeStrategy({ bulk: ["glm", "kimi"], max_failover_attempts: 3 });
    const router = new Router(registry, strategy);
    const result = await router.route({ taskType: "bulk", userMessage: "test" });
    expect(result.providerName).toBe("kimi");
    expect(result.failedProviders).toContain("glm");
  });

  it("does not fail over on non-retryable error", async () => {
    const glmError = new ProviderError("unauthorized", "glm", false, 401);
    const kimiClient = makeClient("kimi");
    const registry = new Map([
      ["glm", makeClient("glm", { error: glmError })],
      ["kimi", kimiClient],
    ]);
    const strategy = makeStrategy({ bulk: ["glm", "kimi"], max_failover_attempts: 3 });
    const router = new Router(registry, strategy);
    await expect(router.route({ taskType: "bulk", userMessage: "test" })).rejects.toThrow();
    expect(kimiClient.complete).not.toHaveBeenCalled();
  });

  it("does not fail over when failover is false", async () => {
    const glmError = new ProviderError("rate limited", "glm", true, 429);
    const kimiClient = makeClient("kimi");
    const registry = new Map([
      ["glm", makeClient("glm", { error: glmError })],
      ["kimi", kimiClient],
    ]);
    const strategy = makeStrategy({ bulk: ["glm", "kimi"], failover: false });
    const router = new Router(registry, strategy);
    await expect(router.route({ taskType: "bulk", userMessage: "test" })).rejects.toThrow();
    expect(kimiClient.complete).not.toHaveBeenCalled();
  });

  it("throws when no providers are available for task type", async () => {
    const registry = new Map<string, ProviderClient>();
    const strategy = makeStrategy({ bulk: [] as unknown as [string, ...string[]] });
    const router = new Router(registry, strategy);
    await expect(router.route({ taskType: "bulk", userMessage: "test" })).rejects.toThrow(
      "No providers available",
    );
  });
});
