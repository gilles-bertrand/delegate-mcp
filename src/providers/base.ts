import type { ProviderConfig } from "../schemas.js";

export interface CompletionRequest {
  model: string;
  systemPrompt?: string;
  userMessage: string;
  maxTokens: number;
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  modelUsed: string;
}

/**
 * Error class that carries enough context for the router to decide whether
 * to fail over to the next provider or surface the error to the caller.
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly retryable: boolean,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface ProviderClient {
  readonly name: string;
  readonly config: ProviderConfig;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}

/**
 * Heuristic: decide if an HTTP status code is worth retrying on another provider.
 * - 429 (rate limit): yes, switch provider
 * - 5xx (server error): yes
 * - 401/403 (auth): no, config issue — surface immediately
 * - 4xx other: no, likely bad request
 */
export function isRetryable(status: number): boolean {
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}
