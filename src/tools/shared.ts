import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Router, RouteRequest, TaskType } from "../router.js";
import { toMessage } from "../utils.js";

/**
 * Common Zod schema for the input that any delegate_* tool accepts.
 * Used to derive both the JSON Schema (for MCP introspection) and the runtime
 * validator. This keeps the contract single-sourced.
 */
export const DelegateInputSchema = z.object({
  task: z.string().min(1).describe(
    "The task description. Be specific — the delegated provider has no prior context.",
  ),
  context: z.string().optional().describe(
    "Optional code, document, or data the provider should work from.",
  ),
  provider_hint: z.string().optional().describe(
    "Optional preferred provider name (e.g. 'glm'). Ignored if unavailable.",
  ),
  model_override: z.string().optional().describe(
    "Optional model override for the chosen provider (e.g. 'glm-4.5-air').",
  ),
  max_tokens: z.number().int().positive().optional().describe(
    "Optional cap on output tokens. Clamped to the provider's max.",
  ),
  response_format: z.enum(["markdown", "json"]).default("markdown").describe(
    "Output format: 'markdown' for human-readable (default), 'json' for machine-readable structured data",
  ),
});

export type DelegateInput = z.infer<typeof DelegateInputSchema>;

export function buildUserMessage(input: DelegateInput): string {
  if (!input.context) return input.task;
  return `${input.task}\n\n---\nContext:\n${input.context}`;
}

export async function runDelegate(
  router: Router,
  taskType: TaskType,
  input: DelegateInput,
  systemPrompt: string,
): Promise<CallToolResult> {
  try {
    const req: RouteRequest = {
      taskType,
      userMessage: buildUserMessage(input),
      systemPrompt,
      ...(input.provider_hint ? { providerHint: input.provider_hint } : {}),
      ...(input.model_override ? { modelOverride: input.model_override } : {}),
      ...(input.max_tokens ? { requestedMaxTokens: input.max_tokens } : {}),
    };
    const result = await router.route(req);

    const data = {
      text: result.text,
      provider: result.providerName,
      model: result.modelUsed,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      failedProviders: result.failedProviders,
    };

    const formattedText = input.response_format === "json"
      ? JSON.stringify(data, null, 2)
      : result.text +
        `\n\n---\n_Delegated to **${result.providerName}** (${result.modelUsed}), ` +
        `${result.inputTokens} in / ${result.outputTokens} out` +
        (result.failedProviders.length > 0
          ? `, after failover from [${result.failedProviders.join(", ")}]`
          : "") +
        `._`;

    return {
      content: [{ type: "text", text: formattedText }],
      structuredContent: data,
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Delegation failed: ${toMessage(err)}. Use 'list_providers' to see available providers and their status. Try 'delegate_to' with an explicit 'provider_hint' if a specific provider is needed.`,
        },
      ],
      isError: true,
    };
  }
}
