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

Uptime Kuma will be available at `http://localhost:3001`

### 2. Configure Environment Variables

Set the following environment variables:

```bash
# Required
export UPTIME_KUMA_URL="http://localhost:3001"

# Authentication (choose one method)

# Method 1: Username and Password
export UPTIME_KUMA_USERNAME="your-username"
export UPTIME_KUMA_PASSWORD="your-password"

# Method 2: API Key
export UPTIME_KUMA_API_KEY="your-api-key"
```

### 3. Run the Server

```bash
bun run dev
```

Or use the built version:

```bash
bun dist/index.js
```

## MCP Configuration

To use this server with an MCP client like Claude Desktop, add it to your MCP configuration:

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
        "UPTIME_KUMA_PASSWORD": "your-password"
        // Alternative: Use API key instead of username/password
        // "UPTIME_KUMA_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Available Tools

### `add_monitor`

Add a new monitor to Uptime Kuma.

**Parameters:**

- `name` (required): Name of the monitor
- `type` (required): Type of monitor (http, port, ping, keyword, dns, docker, push, etc.)
- `url`: URL to monitor (for HTTP monitors)
- `hostname`: Hostname to monitor
- `port`: Port number to monitor
- `interval`: Check interval in seconds (default: 60)
- `active`: Whether the monitor is active (default: true)
- `timeout`: Timeout in seconds
- `method`: HTTP method (GET, POST, etc.)
- `headers`: HTTP headers as JSON string
- `body`: HTTP request body
- `keyword`: Keyword to search for in response
- `expectedStatusCode`: Expected HTTP status codes
- `ignoreTls`: Ignore TLS/SSL errors
- `description`: Monitor description
- ...and many more options

**Example:**

```json
{
  "name": "My Website",
  "type": "http",
  "url": "https://example.com",
  "interval": 60,
  "active": true
}
```

### `update_monitor`

Update an existing monitor.

**Parameters:**

- `id` (required): Monitor ID
- All other fields from `add_monitor` are optional

**Example:**

```json
{
  "id": 1,
  "interval": 120,
  "active": false
}
```

### `remove_monitor`

Remove a monitor from Uptime Kuma.

**Parameters:**

- `id` (required): Monitor ID to remove

### `pause_monitor`

Pause a monitor (stop checking).

**Parameters:**

- `id` (required): Monitor ID to pause

### `resume_monitor`

Resume a paused monitor (start checking again).

**Parameters:**

- `id` (required): Monitor ID to resume

### `get_monitor`

Get details of a specific monitor.

**Parameters:**

- `id` (required): Monitor ID to retrieve

### `list_monitors`

List all monitors in Uptime Kuma.

**Parameters:** None

## Supported Monitor Types

- `http` - HTTP(s) monitoring
- `port` - TCP port monitoring
- `ping` - Ping/ICMP monitoring
- `keyword` - Keyword search in HTTP response
- `grpc-keyword` - gRPC keyword monitoring
- `json-query` - JSON query monitoring
- `dns` - DNS monitoring
- `docker` - Docker container monitoring
- `push` - Push monitoring
- `steam` - Steam game server
- `mqtt` - MQTT monitoring
- `kafka-producer` - Kafka producer
- `sqlserver` - SQL Server database
- `postgres` - PostgreSQL database
- `mysql` - MySQL database
- `mongodb` - MongoDB database
- `radius` - RADIUS server
- `redis` - Redis database
- `group` - Monitor group
- `gamedig` - Game server (via GameDig)
- `tailscale-ping` - Tailscale ping

## Development

### Project Structure

```bash
kuma-mcp/
├── src/
│   ├── index.ts        # Main MCP server
│   ├── client.ts       # Uptime Kuma client implementation
│   └── schemas.ts      # Zod schemas for validation
├── dist/               # Compiled output
├── docker-compose.yml  # Uptime Kuma docker setup
├── package.json
├── tsconfig.json
└── biome.json
```

### Scripts

- `bun run build` - Build the project
- `bun run dev` - Run in development mode
- `bun run lint` - Lint the code
- `bun run lint:fix` - Lint and auto-fix issues
- `bun run format` - Format code with Biome

### Linting and Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check for issues
bun run lint

# Fix issues automatically
bun run lint:fix

# Format code
bun run format
```

## API Reference

For more information about the Uptime Kuma API, see:

- [Uptime Kuma API Documentation](https://github.com/louislam/uptime-kuma/wiki/API-Documentation)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## References

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Uptime Kuma](https://github.com/louislam/uptime-kuma)
- [Uptime Kuma API Documentation](https://github.com/louislam/uptime-kuma/wiki/API-Documentation)
