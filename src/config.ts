import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { AppConfigSchema, type AppConfig } from "./schemas.js";

/**
 * Search order for the config file:
 *  1. $DELEGATE_MCP_CONFIG (explicit override)
 *  2. $XDG_CONFIG_HOME/delegate-mcp/providers.yaml
 *  3. ~/.config/delegate-mcp/providers.yaml
 */
function resolveConfigPath(): string {
  const explicit = process.env.DELEGATE_MCP_CONFIG;
  if (explicit) return explicit;

  const xdg = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(xdg, "delegate-mcp", "providers.yaml");
}

export function loadConfig(): AppConfig {
  const path = resolveConfigPath();
  if (!existsSync(path)) {
    throw new Error(
      `Config file not found at ${path}. ` +
        `Create one or set $DELEGATE_MCP_CONFIG.`,
    );
  }

  const raw = readFileSync(path, "utf-8");
  const parsed = parseYaml(raw);
  const result = AppConfigSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Invalid config at ${path}:\n${result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }

  // Validate that every provider referenced in routing actually exists
  // and is enabled, and that each enabled provider has its API key in env.
  const cfg = result.data;
  const providerNames = Object.keys(cfg.providers);

  for (const [strategy, providers] of Object.entries(cfg.routing)) {
    if (!Array.isArray(providers)) continue; // failover / max_failover_attempts
    for (const name of providers) {
      if (!providerNames.includes(name)) {
        throw new Error(
          `Routing strategy '${strategy}' references unknown provider '${name}'.`,
        );
      }
    }
  }

  for (const [name, p] of Object.entries(cfg.providers)) {
    if (!p.enabled) continue;
    if (!process.env[p.api_key_env]) {
      throw new Error(
        `Provider '${name}' is enabled but env var '${p.api_key_env}' is unset.`,
      );
    }
  }

  return cfg;
}
