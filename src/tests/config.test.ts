import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { loadConfig } from "../config.js";

function writeTmpConfig(content: string): string {
  const path = join(tmpdir(), `delegate-test-${Date.now()}.yaml`);
  writeFileSync(path, content, "utf-8");
  return path;
}

const VALID_YAML = `
log_level: info
providers:
  glm:
    base_url: https://api.z.ai/api/anthropic
    api_key_env: ZAI_API_KEY
    protocol: anthropic
    models:
      default: glm-4.6
    capabilities:
      - code
      - bulk
      - long_context
      - reasoning
    max_tokens: 200000
    cost_tier: 1
    request_timeout_ms: 120000
    enabled: true
routing:
  bulk: [glm]
  long_context: [glm]
  reasoning: [glm]
  code: [glm]
  default: [glm]
  failover: true
  max_failover_attempts: 3
`;

describe("loadConfig()", () => {
  let tmpFile: string | undefined;
  const originalEnv: Record<string, string | undefined> = {};

  afterEach(() => {
    // Restore DELEGATE_MCP_CONFIG
    if ("DELEGATE_MCP_CONFIG" in originalEnv) {
      if (originalEnv.DELEGATE_MCP_CONFIG === undefined) {
        delete process.env.DELEGATE_MCP_CONFIG;
      } else {
        process.env.DELEGATE_MCP_CONFIG = originalEnv.DELEGATE_MCP_CONFIG;
      }
    }
    delete originalEnv.DELEGATE_MCP_CONFIG;

    // Clean up tmp file
    if (tmpFile) {
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      tmpFile = undefined;
    }
  });

  function setConfigEnv(path: string) {
    originalEnv.DELEGATE_MCP_CONFIG = process.env.DELEGATE_MCP_CONFIG;
    process.env.DELEGATE_MCP_CONFIG = path;
  }

  it("throws when config file is not found", () => {
    setConfigEnv("/nonexistent/path.yaml");
    expect(() => loadConfig()).toThrow("Config file not found");
  });

  it("throws on invalid YAML schema (no routing)", () => {
    tmpFile = writeTmpConfig("providers: {}");
    setConfigEnv(tmpFile);
    expect(() => loadConfig()).toThrow("Invalid config");
  });

  it("throws when routing references an unknown provider", () => {
    const yaml = `
log_level: info
providers:
  glm:
    base_url: https://api.z.ai/api/anthropic
    api_key_env: ZAI_API_KEY
    protocol: anthropic
    models:
      default: glm-4.6
    capabilities:
      - bulk
    max_tokens: 200000
    cost_tier: 1
    request_timeout_ms: 120000
    enabled: false
routing:
  bulk: [unknownprovider]
  long_context: [unknownprovider]
  reasoning: [unknownprovider]
  code: [unknownprovider]
  default: [unknownprovider]
  failover: true
  max_failover_attempts: 3
`;
    tmpFile = writeTmpConfig(yaml);
    setConfigEnv(tmpFile);
    expect(() => loadConfig()).toThrow("unknownprovider");
  });

  it("throws when an enabled provider is missing its API key env var", () => {
    // Ensure the env var is truly unset
    const savedKey = process.env.MISSING_KEY_XYZ;
    delete process.env.MISSING_KEY_XYZ;

    const yaml = `
log_level: info
providers:
  glm:
    base_url: https://api.z.ai/api/anthropic
    api_key_env: MISSING_KEY_XYZ
    protocol: anthropic
    models:
      default: glm-4.6
    capabilities:
      - bulk
      - long_context
      - reasoning
      - code
    max_tokens: 200000
    cost_tier: 1
    request_timeout_ms: 120000
    enabled: true
routing:
  bulk: [glm]
  long_context: [glm]
  reasoning: [glm]
  code: [glm]
  default: [glm]
  failover: true
  max_failover_attempts: 3
`;
    tmpFile = writeTmpConfig(yaml);
    setConfigEnv(tmpFile);
    try {
      expect(() => loadConfig()).toThrow("MISSING_KEY_XYZ");
    } finally {
      if (savedKey !== undefined) {
        process.env.MISSING_KEY_XYZ = savedKey;
      }
    }
  });
});
