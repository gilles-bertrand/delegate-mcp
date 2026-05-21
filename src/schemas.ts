import { z } from "zod";

/**
 * Capabilities a provider can claim. Used by the router to filter candidates
 * for each specialized delegate_* tool.
 */
export const CapabilitySchema = z.enum([
  "code",
  "bulk",
  "long_context",
  "ultra_long_context",
  "reasoning",
]);
export type Capability = z.infer<typeof CapabilitySchema>;

/**
 * Wire protocol for the provider's API. Determines which adapter is used.
 *  - "anthropic": /v1/messages-compatible (Z.AI's anthropic-compat endpoint)
 *  - "openai":    /v1/chat/completions-compatible (MiniMax, Kimi, DeepSeek, Ollama)
 */
export const ProtocolSchema = z.enum(["anthropic", "openai"]);
export type Protocol = z.infer<typeof ProtocolSchema>;

export const ProviderConfigSchema = z.object({
  base_url: z.string().url(),
  api_key_env: z.string().min(1),
  protocol: ProtocolSchema,
  models: z.record(z.string(), z.string()).refine(
    (m) => "default" in m,
    { message: "models must include a 'default' entry" },
  ),
  capabilities: z.array(CapabilitySchema).min(1),
  max_tokens: z.number().int().positive(),
  cost_tier: z.number().int().min(1).max(5),
  request_timeout_ms: z.number().int().positive().default(120_000),
  enabled: z.boolean().default(true),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const RoutingStrategySchema = z.object({
  bulk: z.array(z.string()).min(1),
  long_context: z.array(z.string()).min(1),
  reasoning: z.array(z.string()).min(1),
  code: z.array(z.string()).min(1),
  default: z.array(z.string()).min(1),
  failover: z.boolean().default(true),
  max_failover_attempts: z.number().int().min(1).max(5).default(3),
});
export type RoutingStrategy = z.infer<typeof RoutingStrategySchema>;

export const AppConfigSchema = z.object({
  providers: z.record(z.string(), ProviderConfigSchema),
  routing: RoutingStrategySchema,
  log_level: z.enum(["debug", "info", "warn", "error"]).default("info"),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;
