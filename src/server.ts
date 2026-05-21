#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { buildRegistry } from "./providers/factory.js";
import { Router } from "./router.js";
import { registerAllTools } from "./tools/definitions.js";
import { log, setLogLevel } from "./logging.js";
import { toMessage } from "./utils.js";

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

  const server = new McpServer(
    { name: "delegate-mcp", version: "0.1.0" },
  );

  registerAllTools(server, router, registry);

  // SIGUSR1 is reserved by Node.js for the debugger, so SIGHUP is used instead.
  process.on("SIGHUP", () => {
    try {
      const newConfig = loadConfig();
      const newRegistry = buildRegistry(newConfig.providers);
      registry.clear();
      for (const [name, client] of newRegistry) {
        registry.set(name, client);
      }
      log.info("config reloaded via SIGHUP", { providers: [...registry.keys()] });
    } catch (err) {
      log.error("config reload failed", { error: toMessage(err) });
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("delegate-mcp ready on stdio");
}

main().catch((err) => {
  log.error("fatal startup error", { error: toMessage(err) });
  process.exit(1);
});
