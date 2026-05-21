import type { ProviderConfig } from "../schemas.js";
import {
  type CompletionRequest,
  type CompletionResult,
  type ProviderClient,
  ProviderError,
  isRetryable,
} from "./base.js";
import { log } from "../logging.js";

/**
 * Calls an Anthropic-Messages-compatible endpoint.
 * Z.AI exposes this format at https://api.z.ai/api/anthropic/v1/messages.
 *
 * Wire format ref:
 *   POST {base_url}/v1/messages
 *   Body: { model, max_tokens, system?, messages: [{role, content}] }
 *   Response: { content: [{type: "text", text}], usage: {input_tokens, output_tokens} }
 */
export class AnthropicCompatClient implements ProviderClient {
  constructor(
    public readonly name: string,
    public readonly config: ProviderConfig,
  ) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const apiKey = process.env[this.config.api_key_env];
    if (!apiKey) {
      throw new ProviderError(
        `Missing env var ${this.config.api_key_env}`,
        this.name,
        false,
      );
    }

    const url = `${this.config.base_url.replace(/\/$/, "")}/v1/messages`;
    const body = {
      model: req.model,
      max_tokens: req.maxTokens,
      ...(req.systemPrompt ? { system: req.systemPrompt } : {}),
      messages: [{ role: "user", content: req.userMessage }],
    };

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.request_timeout_ms,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : String(err);
      throw new ProviderError(`Network error: ${msg}`, this.name, true);
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => "<no body>");
      log.warn("provider returned non-OK", {
        provider: this.name,
        status: response.status,
        body: text.slice(0, 500),
      });
      throw new ProviderError(
        `HTTP ${response.status}: ${text.slice(0, 200)}`,
        this.name,
        isRetryable(response.status),
        response.status,
      );
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text!)
      .join("");

    return {
      text,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      modelUsed: req.model,
    };
  }
}
