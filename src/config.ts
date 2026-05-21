import { readFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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

function createStarterConfig(configPath: string): void {
  const exampleSrc = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "providers.example.yaml",
  );
  mkdirSync(dirname(configPath), { recursive: true });
  copyFileSync(exampleSrc, configPath);
}

function bootstrapConfig(configPath: string): never {
  createStarterConfig(configPath);
  throw new Error(
    `No config found — created a starter at ${configPath}.\n` +
      `Edit it, add your API keys to your environment, then restart.`,
  );
}

/**
 * Creates the config file from the bundled example if it doesn't exist yet.
 * Returns the resolved config path. Safe to call multiple times.
 */
export function initConfig(): string {
  const path = resolveConfigPath();
  if (!existsSync(path)) {
    createStarterConfig(path);
  }
  return path;
}

export function loadConfig(): AppConfig {
  const path = resolveConfigPath();
  if (!existsSync(path)) {
    bootstrapConfig(path);
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
