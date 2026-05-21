#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
import { buildRegistry } from "./providers/factory.js";
import { Router } from "./router.js";
import { buildTools, buildListProvidersTool } from "./tools/definitions.js";
import { log, setLogLevel } from "./logging.js";

async function main(): Promise<void> {
  const config = loadConfig();
  setLogLevel(config.log_level);

  const registry = buildRegistry(config.providers);
  if (registry.size === 0) {
    log.error("no enabled providers — refusing to start");
    process.exit(1);
  }
  log.info("delegate-mcp starting", {
    providers: [...registry.keys()],
    log_level: config.log_level,
  });

  const router = new Router(registry, config.routing);

  const tools = [
    ...buildTools(router),
    buildListProvidersTool(router, registry),
  ];
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  const server = new Server(
    { name: "delegate-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req): Promise<any> => {
    const tool = toolMap.get(req.params.name);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
        isError: true,
      };
    }
    try {
      return await tool.handler(req.params.arguments ?? {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error("tool handler threw", { tool: req.params.name, error: msg });
      return {
        content: [{ type: "text", text: `Tool error: ${msg}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("delegate-mcp ready on stdio", { tools: [...toolMap.keys()] });
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  log.error("fatal startup error", { error: msg });
  process.exit(1);
});
