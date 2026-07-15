# kuma-mcp

A Model Context Protocol (MCP) server for [Uptime Kuma v2](https://github.com/louislam/uptime-kuma). Enables AI assistants to manage monitoring services — add, update, pause, resume, and remove monitors, check statuses, and inspect heartbeats.

## Quick Start

```bash
# Install globally
npm install -g kuma-mcp

# Or run directly
npx kuma-mcp
```

Requires a running Uptime Kuma v2 instance and credentials.

## Prerequisites

- [Bun](https://bun.sh) or Node.js 18+ (for `npx`)
- An Uptime Kuma v2 instance (see [docker-compose.yml](docker-compose.yml) for local setup)

## Configuration

Set these environment variables:

| Variable | Required | Description |
|---|---|---|
| `UPTIME_KUMA_URL` | Yes | URL of your Uptime Kuma instance (e.g. `http://localhost:3001`) |
| `UPTIME_KUMA_USERNAME` | With password | Username for authentication |
| `UPTIME_KUMA_PASSWORD` | With username | Password for authentication |
Create a `.env` file (copied from `.env.example`) or pass them directly in your MCP client config.

> **Note:** Uptime Kuma API keys are REST-only (used for Prometheus `/metrics` scraping) and cannot be used for monitor management. This server authenticates via username/password over Socket.IO.

## Usage

### As a CLI

```bash
kuma-mcp
```

Starts the MCP server over stdio. Integrate with any MCP-compatible client.

### MCP Client Integration

<details>
<summary><b>Claude Desktop</b> (<code>claude_desktop_config.json</code>)</summary>

```json
{
  "mcpServers": {
    "kuma-mcp": {
      "command": "npx",
      "args": ["kuma-mcp"],
      "env": {
        "UPTIME_KUMA_URL": "http://localhost:3001",
        "UPTIME_KUMA_USERNAME": "your-username",
        "UPTIME_KUMA_PASSWORD": "your-password"
      }
    }
  }
}
```
</details>

<details>
<summary><b>GitHub Copilot</b> (<code>~/.github/copilot.json</code>)</summary>

```json
{
  "mcpServers": {
    "kuma-mcp": {
      "command": "npx",
      "args": ["-y", "kuma-mcp"],
      "env": {
        "UPTIME_KUMA_URL": "http://localhost:3001",
        "UPTIME_KUMA_USERNAME": "your-username",
        "UPTIME_KUMA_PASSWORD": "your-password"
      }
    }
  }
}
```
</details>

<details>
<summary><b>OpenCode</b> (<code>.opencode.json</code>)</summary>

```json
{
  "mcp": {
    "kuma-mcp": {
      "type": "command",
      "command": "bunx",
      "args": ["kuma-mcp"],
      "env": {
        "UPTIME_KUMA_URL": "http://localhost:3001",
        "UPTIME_KUMA_USERNAME": "admin",
        "UPTIME_KUMA_PASSWORD": "admin123"
      }
    }
  }
}
```
</details>

## Available Tools

| Tool | Description |
|---|---|
| `add_monitor` | Add a new monitor |
| `update_monitor_by_id` | Update an existing monitor by ID |
| `remove_monitors` | Remove monitors by IDs |
| `pause_monitors` | Pause monitors by IDs |
| `resume_monitors` | Resume monitors by IDs |
| `get_monitors` | Get details of specific monitors by IDs |
| `find_monitors_by_name` | Find monitors by name (supports regex) |
| `list_monitors` | List all monitors |
| `bulk_update_monitors` | Update multiple monitors at once |
| `get_monitor_status` | Get current status of a monitor |
| `get_monitors_by_status` | Find monitors by status (up/down/paused/...) |
| `get_monitor_heartbeats_by_id` | Get raw heartbeat records |
| `get_monitor_summary_by_id` | Get aggregated 24h health summary |
| `get_tags` | List all tag definitions |
| `add_tag` | Create a new tag |
| `edit_tag` | Update an existing tag |
| `delete_tag` | Delete a tag (removes from all monitors) |
| `add_monitor_tag` | Attach a tag to a monitor |
| `edit_monitor_tag` | Update a tag-monitor association value |
| `delete_monitor_tag` | Remove a tag from a monitor |

## Example Prompts

Try these natural language prompts with an MCP-compatible AI assistant:

- "Show me all monitors that are currently down"
- "Add an HTTP monitor for https://api.example.com/health that checks every 60 seconds and name it 'API Health'"
- "Why did the 'API Prod' monitor go down last night? Look at the last 24 hours of heartbeats"
- "We're doing maintenance tonight — pause the 'API Staging' monitor and all monitors matching 'staging-*'"
- "Give me a 24-hour uptime summary for the 'API Prod' monitor"
- "Remove the old 'api-test-v2' monitor, it's been replaced"
- "Rename 'API Prod' to 'API Production' and increase its check interval to 120 seconds"
- "Tag the 'API Prod' monitor as 'production' with a green tag"
- "Show me all monitors tagged with 'production'"

## Agent Setup Prompt

If you use AI coding agents (OpenCode, Cursor, Windsurf, etc.), paste this prompt into your agent instructions or rules file to have it set up kuma-mcp automatically:

> You have access to a kuma-mcp MCP server that manages an Uptime Kuma monitoring instance. You can create, update, pause, resume, and remove monitors, check their status and heartbeats, and manage tags.
>
> **Monitor lookup pattern**: Always use `find_monitors_by_name` to resolve names to IDs before calling action tools. For example, to pause "API Prod": first call `find_monitors_by_name("API Prod")`, then `pause_monitors({ids: [result.id]})`.
>
> **Available tools**: add_monitor, update_monitor_by_id, remove_monitors, pause_monitors, resume_monitors, get_monitors, find_monitors_by_name, list_monitors, bulk_update_monitors, get_monitor_status, get_monitors_by_status, get_monitor_heartbeats_by_id, get_monitor_summary_by_id, get_tags, add_tag, edit_tag, delete_tag, add_monitor_tag, edit_monitor_tag, delete_monitor_tag.
>
> **Environment**: The server connects via `UPTIME_KUMA_URL`, `UPTIME_KUMA_USERNAME`, and `UPTIME_KUMA_PASSWORD`.

## Development

```bash
git clone https://github.com/tuliof/kuma-mcp.git
cd kuma-mcp
bun install
bun run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT
