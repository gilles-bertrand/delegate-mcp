import type { ProviderConfig } from "../schemas.js";
import type { ProviderClient } from "./base.js";
import { AnthropicCompatClient } from "./anthropic-compat.js";
import { OpenAICompatClient } from "./openai-compat.js";

export function createProviderClient(
  name: string,
  config: ProviderConfig,
): ProviderClient {
  switch (config.protocol) {
    case "anthropic":
      return new AnthropicCompatClient(name, config);
    case "openai":
      return new OpenAICompatClient(name, config);
    default: {
      // Exhaustiveness check
      const _exhaustive: never = config.protocol;
      throw new Error(`Unknown protocol: ${String(_exhaustive)}`);
    }
  }
}

export type ProviderRegistry = Map<string, ProviderClient>;

export function buildRegistry(
  providers: Record<string, ProviderConfig>,
): ProviderRegistry {
  const registry: ProviderRegistry = new Map();
  for (const [name, config] of Object.entries(providers)) {
    if (!config.enabled) continue;
    registry.set(name, createProviderClient(name, config));
  }
  return registry;
}
