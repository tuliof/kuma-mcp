#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { env } from './env'
import { UptimeKumaMCPServer } from './mcp'

// Start the server
async function main() {
  const server = new UptimeKumaMCPServer()

  // Initialize client if credentials are provided
  if (env.UPTIME_KUMA_URL) {
    try {
      await server.initializeClient({
        url: env.UPTIME_KUMA_URL,
        username: env.UPTIME_KUMA_USERNAME,
        password: env.UPTIME_KUMA_PASSWORD,
        apiKey: env.UPTIME_KUMA_API_KEY,
      })
    } catch (error) {
      console.error('Warning: Failed to initialize Uptime Kuma client:', error)
      console.error(
        'The server will start but tools will fail until valid credentials are provided.',
      )
    }
  }

  const transport = new StdioServerTransport()
  await server.getServer().connect(transport)

  console.error('Uptime Kuma MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
