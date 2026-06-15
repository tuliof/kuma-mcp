# kuma-mcp

A Model Context Protocol (MCP) server for Uptime Kuma v2 🐻🤖

This MCP server enables AI assistants to interact with Uptime Kuma, allowing them to manage monitoring services, add/update/remove monitors, and control monitor states.

## Features

- 🔐 **Authentication**: Support for both username/password and API key authentication
- 📊 **Monitor Management**: Add, update, and remove monitors
- ⏯️ **Monitor Control**: Pause and resume monitors
- 📋 **Monitor Information**: Get details of specific monitors or list all monitors
- 🐳 **Docker Support**: Includes docker-compose.yml for easy Uptime Kuma deployment
- 🏗️ **TypeScript**: Fully typed with Zod schema validation
- ⚡ **Built with Bun**: Fast runtime and package manager (requires Node.js v18+ LTS)

## Installation

### Prerequisites

- [Bun](https://bun.sh) installed on your system
- Node.js v18+ LTS
- An Uptime Kuma v2 instance (can be started with included docker-compose.yml)

### Install Dependencies

```bash
bun install
```

### Build

```bash
bun run build
```

## Quick Start

### 1. Start Uptime Kuma (Optional)

If you don't have an Uptime Kuma instance running, use the included docker-compose:

```bash
docker-compose up -d
```

Uptime Kuma will be available at `http://localhost:3001`. Go to the URL and finish the uptime-kuma configuration.

### 2. Configure Environment Variables

Set the credentials in `.env`:

```bash
cp .env.example .env
```

### 3. Run the Server

```bash
bun run dev
```

Or use the built version:

```bash
bun run build
bun dist/index.js
```

## Testing with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a visual tool for testing and debugging MCP servers. It provides an interactive interface to explore your server's capabilities, test tools, and inspect responses.

### Run with Inspector

Start your MCP server with the Inspector:

```bash
bunx @modelcontextprotocol/inspector bun run dev
```

or the built version

```bash
bun run build
bunx @modelcontextprotocol/inspector bun run dist/index.js
```

The Inspector will:

1. Start your MCP server
2. Open a web interface (typically at `http://localhost:6274`)
3. Allow you to interactively test all available tools
4. Display real-time request/response data
5. Help debug issues with your server

### Using the Inspector

Once the Inspector is running:

1. **Connect to Server**: The Inspector automatically connects to your MCP server
2. **Browse Tools**: View all available tools (`add_monitor`, `list_monitors`, etc)
3. **Test Tools**: Fill in parameters and execute tools to see responses
4. **Inspect Results**: View detailed request/response JSON
5. **Debug Issues**: Check for errors and validation problems

This is especially useful for:

- Testing monitor creation with different configurations
- Verifying authentication is working correctly
- Exploring the response format of each tool
- Debugging issues before integrating with Claude Desktop or other MCP clients

## MCP Configuration

To use this server with an MCP client, add it to your client's MCP configuration using the built `dist/index.js` entry point.

> [!NOTE]
> Environment variables can be passed from `.env` or set directly in the MCP client config (preferred for tools like GitHub Copilot that don't load `.env` natively).

### GitHub Copilot Configuration

In your GitHub Copilot settings, edit `~/.github/copilot.json` (or the VS Code equivalent):

```jsonc
{
  "mcpServers": {
    "kuma-mcp": {
      "command": "node",
      "args": ["/path/to/kuma-mcp/dist/index.js"],
      "env": {
        "UPTIME_KUMA_URL": "http://localhost:3001",
        "UPTIME_KUMA_USERNAME": "your-username",
        "UPTIME_KUMA_PASSWORD": "your-password"
      }
    }
  }
}
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```jsonc
{
  "mcpServers": {
    "kuma-mcp": {
      "command": "node",
      "args": ["/path/to/kuma-mcp/dist/index.js"],
      "env": {
        "UPTIME_KUMA_URL": "http://localhost:3001",
        "UPTIME_KUMA_USERNAME": "your-username",
        "UPTIME_KUMA_PASSWORD": "your-password",
        // Alternative: Use API key instead of username/password
        // "UPTIME_KUMA_API_KEY": "your-api-key"
      }
    }
  }
}
```

### OpenCode Configuration

Add to your project's `.opencode.json` or global config:

```jsonc
{
  "mcp": {
    "kuma-mcp": {
      "type": "command",
      "command": "bun",
      "args": ["run", "dev"],
      "env": {
        "UPTIME_KUMA_URL": "http://localhost:3001",
        "UPTIME_KUMA_USERNAME": "admin",
        "UPTIME_KUMA_PASSWORD": "admin123"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `add_monitor` | Add a new monitor |
| `update_monitor_by_id` | Update an existing monitor by ID |
| `remove_monitor_by_id` | Remove a monitor by ID |
| `pause_monitor_by_id` | Pause a monitor by ID |
| `resume_monitor_by_id` | Resume a paused monitor by ID |
| `get_monitor_by_id` | Get monitor details by ID |
| `find_monitors_by_name` | Find monitors by name (supports regex) |
| `list_monitors` | List all monitors |
| `pause_monitors_by_name` | Pause all monitors matching a name pattern |
| `resume_monitors_by_name` | Resume all monitors matching a name pattern |
| `bulk_update_monitors` | Update multiple monitors at once |
| `get_monitor_status` | Get current status of a monitor |
| `get_monitors_by_status` | Find monitors by status (up/down/paused/...) |
| `get_monitor_heartbeats_by_id` | Get raw heartbeat records |
| `get_monitor_summary_by_id` | Get aggregated 24h health summary |


## API Reference

For more information about the Uptime Kuma API, see:

- [Uptime Kuma API Documentation](https://github.com/louislam/uptime-kuma/wiki/API-Documentation)
- [uptime-kuma-api - A Python wrapper for the Uptime Kuma Socket.IO API](https://github.com/lucasheld/uptime-kuma-api)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

This project uses [Semantic Commit Messages](https://www.conventionalcommits.org/). See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

MIT

## References

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Uptime Kuma](https://github.com/louislam/uptime-kuma)
- [Uptime Kuma API Documentation](https://github.com/louislam/uptime-kuma/wiki/API-Documentation)
