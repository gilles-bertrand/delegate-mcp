import { zodToJsonSchema } from "./zod-to-json.js";
import { DelegateInputSchema, runDelegate, type FormattedResult } from "./shared.js";
import type { Router } from "../router.js";

/**
 * Tool descriptions are CRITICAL — they're what Sonnet reads to decide which
 * tool to call. Be specific about use cases, not abstract.
 */

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: unknown) => Promise<FormattedResult>;
}

export function buildTools(router: Router): ToolDef[] {
  const baseSchema = zodToJsonSchema(DelegateInputSchema);

  return [
    {
      name: "delegate_bulk",
      description:
        "Delegate REPETITIVE or BOILERPLATE work to a cheap fast provider. " +
        "Use for: generating many similar unit tests, writing CRUD endpoints from a schema, " +
        "translating between similar formats, generating mock data, repetitive refactors across files. " +
        "DO NOT use for: architecture decisions, complex debugging, anything requiring deep reasoning. " +
        "Returns the provider's text response.",
      inputSchema: baseSchema,
      handler: async (input) => {
        const parsed = DelegateInputSchema.parse(input);
        return runDelegate(
          router,
          "bulk",
          parsed,
          "You are a fast, accurate code generation assistant. Produce direct output without preamble.",
        );
      },
    },
    {
      name: "delegate_long_context",
      description:
        "Delegate analysis of LARGE content (10k+ tokens) to a long-context provider. " +
        "Use for: summarizing or extracting facts from large log files, analyzing big codebases, " +
        "reviewing long documents, processing data tables. " +
        "DO NOT use for: small inputs (use delegate_bulk) or tasks requiring back-and-forth reasoning.",
      inputSchema: baseSchema,
      handler: async (input) => {
        const parsed = DelegateInputSchema.parse(input);
        return runDelegate(
          router,
          "long_context",
          parsed,
          "You are an analytical assistant specialized in processing large inputs. " +
            "Be precise and concise.",
        );
      },
    },
    {
      name: "delegate_reasoning",
      description:
        "Delegate a SECOND-OPINION reasoning task to a different model than Claude. " +
        "Use for: cross-checking architecture decisions, debugging tricky problems where a fresh " +
        "perspective helps, comparing alternative implementations. " +
        "DO NOT use as a primary problem-solver — Claude (the caller) is typically stronger; " +
        "use this for diversity of viewpoint.",
      inputSchema: baseSchema,
      handler: async (input) => {
        const parsed = DelegateInputSchema.parse(input);
        return runDelegate(
          router,
          "reasoning",
          parsed,
          "You are a thoughtful reviewer. Reason step by step and challenge assumptions when needed.",
        );
      },
    },
    {
      name: "delegate_to",
      description:
        "Delegate a task to a SPECIFIC provider by name. Use when you need to force the choice " +
        "(e.g. testing a provider, or you know one provider handles a particular language better). " +
        "Requires the 'provider_hint' field to specify which provider. " +
        "Prefer the specialized tools (delegate_bulk, delegate_long_context, delegate_reasoning) " +
        "unless you have a specific reason to pick the provider yourself.",
      inputSchema: baseSchema,
      handler: async (input) => {
        const parsed = DelegateInputSchema.parse(input);
        if (!parsed.provider_hint) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: delegate_to requires 'provider_hint'. Use list_providers to see available names.",
              },
            ],
            isError: true,
          };
        }
        return runDelegate(
          router,
          "default",
          parsed,
          "You are a coding assistant. Produce direct, accurate output.",
        );
      },
    },
  ];
}

export function buildListProvidersTool(
  router: Router,
  registry: ReadonlyMap<string, { config: { models: Record<string, string>; capabilities: string[]; cost_tier: number; max_tokens: number } }>,
): ToolDef {
  return {
    name: "list_providers",
    description:
      "List all configured delegation providers, their capabilities, default models, and max " +
      "context windows. Call this first if you're unsure which provider to hint at.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      const lines: string[] = ["Available delegation providers:\n"];
      for (const [name, client] of registry) {
        lines.push(`• ${name}`);
        lines.push(`  default model: ${client.config.models.default}`);
        const altModels = Object.entries(client.config.models)
          .filter(([k]) => k !== "default");
        if (altModels.length > 0) {
          lines.push(
            `  alt models: ${altModels.map(([k, v]) => `${k}=${v}`).join(", ")}`,
          );
        }
        lines.push(`  capabilities: ${client.config.capabilities.join(", ")}`);
        lines.push(`  max context: ${client.config.max_tokens.toLocaleString()} tokens`);
        lines.push(`  cost tier: ${client.config.cost_tier} (1=cheapest)`);
        lines.push("");
      }
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  };
}
