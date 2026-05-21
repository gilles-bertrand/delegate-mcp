import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { DelegateInputSchema, runDelegate } from "./shared.js";
import type { Router } from "../router.js";
import type { TaskType } from "../router.js";
import type { ProviderRegistry } from "../providers/factory.js";

/**
 * Tool descriptions are CRITICAL — they're what Sonnet reads to decide which
 * tool to call. Be specific about use cases, not abstract.
 */

const delegateAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} satisfies ToolAnnotations;

const delegateShape = DelegateInputSchema.shape;

// delegate_to requires an explicit provider — enforce at schema level so the
// SDK rejects calls missing provider_hint before the handler runs.
const DelegateToInputSchema = DelegateInputSchema.extend({
  provider_hint: z.string().min(1).describe(
    "Required provider name (e.g. 'glm'). Use list_providers to see available names.",
  ),
});

function registerDelegateTool(
  server: McpServer,
  router: Router,
  name: string,
  title: string,
  description: string,
  taskType: TaskType,
  systemPrompt: string,
): void {
  server.registerTool(
    name,
    { title, description, inputSchema: delegateShape, annotations: delegateAnnotations },
    (args) => runDelegate(router, taskType, args, systemPrompt),
  );
}

export function registerAllTools(
  server: McpServer,
  router: Router,
  registry: ProviderRegistry,
): void {
  registerDelegateTool(
    server, router,
    "delegate_bulk",
    "Delegate Bulk Work",
    "Delegate REPETITIVE or BOILERPLATE work to a cheap fast provider. " +
    "Use for: generating many similar unit tests, writing CRUD endpoints from a schema, " +
    "translating between similar formats, generating mock data, repetitive refactors across files. " +
    "DO NOT use for: architecture decisions, complex debugging, anything requiring deep reasoning. " +
    "Returns the provider's text response.",
    "bulk",
    "You are a fast, accurate code generation assistant. Produce direct output without preamble.",
  );

  registerDelegateTool(
    server, router,
    "delegate_long_context",
    "Delegate Long Context Analysis",
    "Delegate analysis of LARGE content (10k+ tokens) to a long-context provider. " +
    "Use for: summarizing or extracting facts from large log files, analyzing big codebases, " +
    "reviewing long documents, processing data tables. " +
    "DO NOT use for: small inputs (use delegate_bulk) or tasks requiring back-and-forth reasoning.",
    "long_context",
    "You are an analytical assistant specialized in processing large inputs. Be precise and concise.",
  );

  registerDelegateTool(
    server, router,
    "delegate_reasoning",
    "Delegate Reasoning Task",
    "Delegate a SECOND-OPINION reasoning task to a different model than Claude. " +
    "Use for: cross-checking architecture decisions, debugging tricky problems where a fresh " +
    "perspective helps, comparing alternative implementations. " +
    "DO NOT use as a primary problem-solver — Claude (the caller) is typically stronger; " +
    "use this for diversity of viewpoint.",
    "reasoning",
    "You are a thoughtful reviewer. Reason step by step and challenge assumptions when needed.",
  );

  server.registerTool(
    "delegate_to",
    {
      title: "Delegate to Specific Provider",
      description:
        "Delegate a task to a SPECIFIC provider by name. Use when you need to force the choice " +
        "(e.g. testing a provider, or you know one provider handles a particular language better). " +
        "Requires the 'provider_hint' field to specify which provider. " +
        "Prefer the specialized tools (delegate_bulk, delegate_long_context, delegate_reasoning) " +
        "unless you have a specific reason to pick the provider yourself.",
      inputSchema: DelegateToInputSchema.shape,
      annotations: delegateAnnotations,
    },
    (args) => runDelegate(router, "default", args, "You are a coding assistant. Produce direct, accurate output."),
  );

  server.registerTool(
    "list_providers",
    {
      title: "List Delegation Providers",
      description:
        "List all configured delegation providers, their capabilities, default models, and max " +
        "context windows. Call this first if you're unsure which provider to hint at.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      } satisfies ToolAnnotations,
    },
    () => {
      const lines: string[] = ["Available delegation providers:\n"];
      for (const [name, client] of registry) {
        lines.push(`• ${name}`);
        lines.push(`  default model: ${client.config.models.default}`);
        const altModels = Object.entries(client.config.models).filter(([k]) => k !== "default");
        if (altModels.length > 0) {
          lines.push(`  alt models: ${altModels.map(([k, v]) => `${k}=${v}`).join(", ")}`);
        }
        lines.push(`  capabilities: ${client.config.capabilities.join(", ")}`);
        lines.push(`  max context: ${client.config.max_tokens.toLocaleString()} tokens`);
        lines.push(`  cost tier: ${client.config.cost_tier} (1=cheapest)`);
        lines.push("");
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
