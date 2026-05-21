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
 * Calls an OpenAI-/v1/chat/completions-compatible endpoint.
 * Used by MiniMax, Kimi (Moonshot), DeepSeek, Ollama, and most "OpenAI-compat" APIs.
 *
 * Wire format ref:
 *   POST {base_url}/chat/completions
 *   Body: { model, max_tokens, messages: [{role, content}] }
 *   Response: { choices: [{message: {content}}], usage: {prompt_tokens, completion_tokens} }
 */
export class OpenAICompatClient implements ProviderClient {
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

    const url = `${this.config.base_url.replace(/\/$/, "")}/chat/completions`;
    const messages: Array<{ role: string; content: string }> = [];
    if (req.systemPrompt) {
      messages.push({ role: "system", content: req.systemPrompt });
    }
    messages.push({ role: "user", content: req.userMessage });

    const body = {
      model: req.model,
      max_tokens: req.maxTokens,
      messages,
      stream: false,
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
          Authorization: `Bearer ${apiKey}`,
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
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content ?? "";

    return {
      text,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      modelUsed: req.model,
    };
  }
}
