# delegate-mcp

Generic multi-provider MCP delegate server for Claude Code.

Sonnet/Opus stay in the driver's seat. When a sub-task is best handled by a cheaper or longer-context model (GLM, MiniMax, Kimi, DeepSeek, …), Claude calls one of the `delegate_*` tools. No CLI switching, no model routing flags, no lost flat-fee subscriptions.

## Architecture

```
Claude Code (Sonnet/Opus, Anthropic Team flat fee)
  │
  ↓ MCP tools over stdio
delegate-mcp
  │
  ├─→ delegate_bulk          → cheapest provider in routing.bulk
  ├─→ delegate_long_context  → best for >10k tokens
  ├─→ delegate_reasoning     → second-opinion model
  ├─→ delegate_to            → explicit provider pick
  └─→ list_providers         → discovery
       │
       ↓ (HTTP, per-provider adapter)
   ┌────────┬─────────┬─────────┬──────────┐
   │  GLM   │ MiniMax │  Kimi   │ DeepSeek │  (each via its own flat-fee key)
   └────────┴─────────┴─────────┴──────────┘
```

## Why this design

- **No double billing.** Anthropic stays on the Team OAuth flow (zero per-token cost). GLM / others called via their flat-fee API keys. No traffic goes through CCR or a token-counting proxy.
- **Sonnet orchestrates.** Tool descriptions (`delegate_bulk: for repetitive boilerplate…`) guide Sonnet to pick the right delegation point. You don't manage routing flags.
- **One CLI session.** Replaces the `zoda` / `cc` / `ccg` split. Open Claude Code and that's it.
- **Add providers in 8 lines of YAML.** No code changes needed for new endpoints that speak Anthropic-Messages or OpenAI-Chat-Completions wire formats.
- **Failover built-in.** If GLM is rate-limited, requests automatically retry on the next provider in the strategy list.

## Install

### 1. Build

```bash
git clone <this-repo> ~/dev/delegate-mcp
cd ~/dev/delegate-mcp
npm install
npm run build
```

### 2. Configure

```bash
mkdir -p ~/.config/delegate-mcp
cp providers.example.yaml ~/.config/delegate-mcp/providers.yaml
$EDITOR ~/.config/delegate-mcp/providers.yaml
```

### 3. Export your API keys

Put them in `~/.zshrc` (or your secret manager — Infisical, pass, etc.):

```bash
export ZAI_API_KEY="sk-zai-…"
# Later:
# export MINIMAX_API_KEY="…"
# export MOONSHOT_API_KEY="…"
# export DEEPSEEK_API_KEY="…"
```

### 4. Register with Claude Code

```bash
claude mcp add --scope user --transport stdio delegate \
  -- node /home/gilles/dev/delegate-mcp/dist/server.js
```

Verify:

```bash
claude mcp list
```

You should see `delegate` connected. Open Claude Code (`claude`) and Sonnet will discover the tools automatically.

## Usage

You don't call the tools — Sonnet does. Just describe what you want:

> "Generate 30 unit tests covering edge cases for the `parseInvoice` function. Use delegate_bulk."

Sonnet will call `delegate_bulk` with the task and context, GLM produces the tests, and Sonnet integrates the result.

To force a provider:

> "Use delegate_to with provider_hint='glm' and model_override='glm-4.5-air' to draft a CHANGELOG from these commits."

## Adding a provider

1. Add an entry under `providers:` in `providers.yaml` (see commented examples).
2. Add the provider name to the relevant `routing.*` lists.
3. Set the API key env var.
4. Restart Claude Code (so the MCP server re-reads config).

No code change required as long as the provider speaks `anthropic` or `openai` wire format. For exotic protocols, add a new adapter in `src/providers/`.

## Development

```bash
npm run dev          # tsx watch mode
npm run typecheck    # strict tsc check
npm run build        # emit dist/
```

Logs go to **stderr** (stdout is reserved for MCP JSON-RPC). Use `log_level: debug` in your YAML for full request traces, then watch:

```bash
tail -f ~/.claude/logs/mcp-delegate.log   # if Claude Code persists MCP logs
# or use `claude mcp logs delegate`
```

## License

MIT — internal Triptyk tooling.
