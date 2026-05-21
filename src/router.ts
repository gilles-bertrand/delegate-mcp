import type { RoutingStrategy } from "./schemas.js";
import type { ProviderRegistry } from "./providers/factory.js";
import {
  type CompletionRequest,
  type CompletionResult,
  ProviderError,
} from "./providers/base.js";
import { log } from "./logging.js";

export type TaskType = "bulk" | "long_context" | "reasoning" | "code" | "default";

export interface RouteRequest {
  taskType: TaskType;
  /** Optional hint from Claude (subject to validation by router). */
  providerHint?: string;
  /** Optional explicit model override. Requires providerHint. */
  modelOverride?: string;
  systemPrompt?: string;
  userMessage: string;
  /** Caller-specified max tokens; will be clamped to provider's max_tokens. */
  requestedMaxTokens?: number;
}

export interface RouteResult extends CompletionResult {
  /** The provider that actually fulfilled the request. */
  providerName: string;
  /** Providers that were attempted and failed before success. */
  failedProviders: string[];
}

export class Router {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly strategy: RoutingStrategy,
  ) {}

  /**
   * Build the ordered candidate list for a route request.
   * - If providerHint is given AND available, it goes first.
   * - The strategy's preferred order follows for failover.
   * - Disabled / missing providers are filtered out.
   */
  private buildCandidates(req: RouteRequest): string[] {
    const strategyList = this.strategy[req.taskType];
    const candidates: string[] = [];

    if (req.providerHint && this.registry.has(req.providerHint)) {
      candidates.push(req.providerHint);
    } else if (req.providerHint) {
      log.warn("provider hint ignored: not available", {
        hint: req.providerHint,
        available: [...this.registry.keys()],
      });
    }

    for (const name of strategyList) {
      if (!candidates.includes(name) && this.registry.has(name)) {
        candidates.push(name);
      }
    }

    if (!this.strategy.failover) {
      return candidates.slice(0, 1);
    }
    return candidates.slice(0, this.strategy.max_failover_attempts);
  }

  async route(req: RouteRequest): Promise<RouteResult> {
    const candidates = this.buildCandidates(req);
    if (candidates.length === 0) {
      throw new Error(
        `No providers available for task type '${req.taskType}'. ` +
          `Check that at least one provider in routing.${req.taskType} is enabled.`,
      );
    }

    const failed: string[] = [];
    let lastError: Error | undefined;

    for (const name of candidates) {
      const client = this.registry.get(name)!;
      const model = req.modelOverride ?? client.config.models.default;
      if (!model) {
        log.warn("provider has no default model", { provider: name });
        failed.push(name);
        continue;
      }

      const maxTokens = Math.min(
        req.requestedMaxTokens ?? client.config.max_tokens,
        client.config.max_tokens,
      );

      const completionReq: CompletionRequest = {
        model,
        userMessage: req.userMessage,
        maxTokens,
        ...(req.systemPrompt ? { systemPrompt: req.systemPrompt } : {}),
      };

      const startedAt = Date.now();
      try {
        log.info("dispatching", { provider: name, model, taskType: req.taskType });
        const result = await client.complete(completionReq);
        const elapsedMs = Date.now() - startedAt;
        log.info("provider succeeded", {
          provider: name,
          model,
          elapsedMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        });
        return { ...result, providerName: name, failedProviders: failed };
      } catch (err) {
        const elapsedMs = Date.now() - startedAt;
        const isProviderErr = err instanceof ProviderError;
        const retryable = isProviderErr ? err.retryable : true;
        log.warn("provider failed", {
          provider: name,
          model,
          elapsedMs,
          retryable,
          error: err instanceof Error ? err.message : String(err),
        });
        failed.push(name);
        lastError = err instanceof Error ? err : new Error(String(err));
        if (!retryable) break; // auth errors etc. — don't waste tries
      }
    }

    throw new Error(
      `All ${failed.length} provider(s) failed for task type '${req.taskType}'. ` +
        `Attempted: [${failed.join(", ")}]. Last error: ${lastError?.message ?? "unknown"}`,
    );
  }
}
