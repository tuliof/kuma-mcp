# Example: Using kuma-mcp with Claude Desktop

This example shows how to configure and use the kuma-mcp server with Claude Desktop.

## 1. Start Uptime Kuma

```bash
docker-compose up -d
```

Open http://localhost:3001 in your browser and complete the initial setup to create an admin user.

## 2. Configure Claude Desktop

Edit your Claude Desktop configuration file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add the kuma-mcp server configuration:

```json
{
  "mcpServers": {
    "kuma-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/kuma-mcp/dist/index.js"],
      "env": {
        "UPTIME_KUMA_URL": "http://localhost:3001",
        "UPTIME_KUMA_USERNAME": "admin",
        "UPTIME_KUMA_PASSWORD": "your-password"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/kuma-mcp` with the actual path to your kuma-mcp directory.

## 3. Restart Claude Desktop

Restart Claude Desktop to load the new MCP server configuration.

## 4. Use the Tools

You can now ask Claude to interact with Uptime Kuma. Here are some example prompts:

### Add a Monitor
```
Please add a new HTTP monitor to check https://example.com every 60 seconds
```

### List Monitors
```
Show me all the monitors in Uptime Kuma
```

### Update a Monitor
```
Update monitor ID 1 to check every 120 seconds instead
```

### Pause a Monitor
```
Pause monitor ID 1
```

### Resume a Monitor
```
Resume monitor ID 1
```

### Get Monitor Details
```
Show me the details of monitor ID 1
```

### Remove a Monitor
```
Remove monitor ID 1
```

## Example Conversation

**You**: "Can you add a monitor for my website https://mysite.com that checks every 30 seconds?"

**Claude**: "I'll add a monitor for your website. Let me use the add_monitor tool."
*Claude calls the add_monitor tool with appropriate parameters*
"I've successfully added a monitor for https://mysite.com with a 30-second check interval. The monitor ID is 1."

**You**: "Can you show me all my monitors?"

**Claude**: "Let me list all your monitors."
*Claude calls the list_monitors tool*
"Here are all your monitors: [displays the list]"

## Troubleshooting

### Server not starting
- Check that Bun is installed: `bun --version`
- Check that Node.js v18+ LTS is installed: `node --version`
- Verify the path in the config is correct
- Check Claude Desktop logs for error messages

### Authentication fails
- Verify your Uptime Kuma credentials are correct
- Make sure Uptime Kuma is running and accessible
- Check the UPTIME_KUMA_URL is correct (include http:// or https://)

### Tools not appearing
- Restart Claude Desktop after configuration changes
- Check the config file for JSON syntax errors
- Verify the path to dist/index.js is absolute

## Using with API Key

If you prefer to use an API key instead of username/password:

1. Generate an API key in Uptime Kuma (Settings > Security > API Keys)
2. Update the configuration:

```json
{
  "mcpServers": {
    "kuma-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/kuma-mcp/dist/index.js"],
      "env": {
        "UPTIME_KUMA_URL": "http://localhost:3001",
        "UPTIME_KUMA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```
