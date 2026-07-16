#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { UptimeKumaMCPServer } from './mcp.js'

// Start the server
async function main() {
  // biome-ignore lint/complexity/useLiteralKeys: process.env has index signature
  const uptimeKumaUrl = process.env['UPTIME_KUMA_URL']
  // biome-ignore lint/complexity/useLiteralKeys: process.env has index signature
  const uptimeKumaUsername = process.env['UPTIME_KUMA_USERNAME']
  // biome-ignore lint/complexity/useLiteralKeys: process.env has index signature
  const uptimeKumaPassword = process.env['UPTIME_KUMA_PASSWORD']

  if (!uptimeKumaUrl || !uptimeKumaUsername || !uptimeKumaPassword) {
    const missingVars: string[] = []
    if (!uptimeKumaUrl) missingVars.push('UPTIME_KUMA_URL')
    if (!uptimeKumaUsername) missingVars.push('UPTIME_KUMA_USERNAME')
    if (!uptimeKumaPassword) missingVars.push('UPTIME_KUMA_PASSWORD')

    console.error('')
    console.error(`  Error: ${missingVars.join(', ')} must be set.`)
    console.error('')
    console.error('  Run with inline env vars:')
    console.error(
      '    UPTIME_KUMA_URL="http://localhost:3001" UPTIME_KUMA_USERNAME="admin" UPTIME_KUMA_PASSWORD="your-password" npx kuma-mcp',
    )
    console.error('')
    console.error('  See README.md for how to configure it permanently in your MCP client.')
    console.error('')
    process.exit(1)
  }

  const server = new UptimeKumaMCPServer()

  try {
    await server.initializeClient({
      url: uptimeKumaUrl,
      username: uptimeKumaUsername,
      password: uptimeKumaPassword,
    })
  } catch (error) {
    console.error('Failed to connect to Uptime Kuma:', error)
    console.error('Check that UPTIME_KUMA_URL is correct and the server is running.')
    process.exit(1)
  }

  const transport = new StdioServerTransport()
  await server.getServer().connect(transport)

  console.error('Uptime Kuma MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
