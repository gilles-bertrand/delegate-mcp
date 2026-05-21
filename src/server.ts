#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, initConfig } from "./config.js";
import { buildRegistry } from "./providers/factory.js";
import { Router } from "./router.js";
import { registerAllTools } from "./tools/definitions.js";
import { log, setLogLevel } from "./logging.js";
import { toMessage } from "./utils.js";

if (process.argv[2] === "init") {
  const configPath = initConfig();
  process.stderr.write(
    `delegate-mcp: config ready at ${configPath}\n` +
      `Next steps:\n` +
      `  1. Edit the config:  $EDITOR ${configPath}\n` +
      `  2. Set your API key env vars (see comments in the file)\n` +
      `  3. Register with Claude Code:\n` +
      `       claude mcp add --scope user --transport stdio delegate \\\n` +
      `         -- npx -y @triptyk/delegate-mcp\n`,
  );
  process.exit(0);
}

function registerSetupTool(server: McpServer, reason: string): void {
  server.tool(
    "delegate_setup_required",
    "delegate-mcp is not configured. Call this tool to get setup instructions.",
    {},
    async () => ({
      content: [
        {
          type: "text" as const,
          text:
            `⚠️  delegate-mcp needs configuration before delegation tools are available.\n\n` +
            `Reason: ${reason}\n\n` +
            `Setup steps:\n` +
            `  1. Run once:  npx @triptyk/delegate-mcp init\n` +
            `  2. Edit:      ~/.config/delegate-mcp/providers.yaml\n` +
            `  3. Set your API key env vars (see comments in the file)\n` +
            `  4. Restart Claude Code to reload the MCP server\n`,
        },
      ],
    }),
  );
}

async function main(): Promise<void> {
  const server = new McpServer({ name: "delegate-mcp", version: "0.1.0" });

  let config;
  try {
    config = loadConfig();
  } catch (err) {
    const reason = toMessage(err);
    log.error("config error — starting in degraded mode", { error: reason });
    registerSetupTool(server, reason);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

  setLogLevel(config.log_level);

  const registry = buildRegistry(config.providers);
  if (registry.size === 0) {
    const reason = "No providers are enabled in providers.yaml.";
    log.error(reason);
    registerSetupTool(server, reason);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

  log.info("delegate-mcp starting", {
    providers: [...registry.keys()],
    log_level: config.log_level,
  });

  const router = new Router(registry, config.routing);
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
