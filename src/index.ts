#!/usr/bin/env node

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      UPTIME_KUMA_URL?: string
      UPTIME_KUMA_USERNAME?: string
      UPTIME_KUMA_PASSWORD?: string
      UPTIME_KUMA_API_KEY?: string
    }
  }
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { UptimeKumaClient } from './client.js'
import {
  AddMonitorInputSchema,
  AuthConfigSchema,
  GetMonitorInputSchema,
  ListMonitorsInputSchema,
  PauseMonitorInputSchema,
  RemoveMonitorInputSchema,
  ResumeMonitorInputSchema,
  UpdateMonitorInputSchema,
} from './schemas.js'

const TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'add_monitor',
    description:
      'Add a new monitor to Uptime Kuma. Monitors can check various services like HTTP endpoints, ports, ping, DNS, databases, and more.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the monitor' },
        type: {
          type: 'string',
          enum: [
            'http',
            'port',
            'ping',
            'keyword',
            'grpc-keyword',
            'json-query',
            'dns',
            'docker',
            'push',
            'steam',
            'mqtt',
            'kafka-producer',
            'sqlserver',
            'postgres',
            'mysql',
            'mongodb',
            'radius',
            'redis',
            'group',
            'gamedig',
            'tailscale-ping',
          ],
          description: 'Type of monitor',
        },
        url: { type: 'string', description: 'URL to monitor (for HTTP monitors)' },
        hostname: { type: 'string', description: 'Hostname to monitor' },
        port: { type: 'number', description: 'Port number to monitor' },
        interval: {
          type: 'number',
          description: 'Check interval in seconds (default: 60)',
          default: 60,
        },
        retryInterval: { type: 'number', description: 'Retry interval in seconds' },
        maxretries: { type: 'number', description: 'Maximum number of retries' },
        active: {
          type: 'boolean',
          description: 'Whether the monitor is active (default: true)',
          default: true,
        },
        timeout: { type: 'number', description: 'Timeout in seconds' },
        method: { type: 'string', description: 'HTTP method (GET, POST, etc.)' },
        headers: { type: 'string', description: 'HTTP headers as JSON string' },
        body: { type: 'string', description: 'HTTP request body' },
        keyword: { type: 'string', description: 'Keyword to search for in response' },
        expectedStatusCode: { type: 'string', description: 'Expected HTTP status codes' },
        ignoreTls: { type: 'boolean', description: 'Ignore TLS/SSL errors' },
        description: { type: 'string', description: 'Monitor description' },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'update_monitor',
    description: 'Update an existing monitor in Uptime Kuma',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Monitor ID' },
        name: { type: 'string', description: 'Name of the monitor' },
        type: { type: 'string', description: 'Type of monitor' },
        url: { type: 'string', description: 'URL to monitor' },
        hostname: { type: 'string', description: 'Hostname to monitor' },
        port: { type: 'number', description: 'Port number to monitor' },
        interval: { type: 'number', description: 'Check interval in seconds' },
        active: { type: 'boolean', description: 'Whether the monitor is active' },
        timeout: { type: 'number', description: 'Timeout in seconds' },
        description: { type: 'string', description: 'Monitor description' },
      },
      required: ['id'],
    },
  },
  {
    name: 'remove_monitor',
    description: 'Remove a monitor from Uptime Kuma',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Monitor ID to remove' },
      },
      required: ['id'],
    },
  },
  {
    name: 'pause_monitor',
    description: 'Pause a monitor in Uptime Kuma (stop checking)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Monitor ID to pause' },
      },
      required: ['id'],
    },
  },
  {
    name: 'resume_monitor',
    description: 'Resume a paused monitor in Uptime Kuma (start checking again)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Monitor ID to resume' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_monitor',
    description: 'Get details of a specific monitor',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Monitor ID to retrieve' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_monitors',
    description: 'List all monitors in Uptime Kuma',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

class UptimeKumaMCPServer {
  private server: Server
  private client: UptimeKumaClient | null = null

  constructor() {
    this.server = new Server(
      {
        name: 'kuma-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    )

    this.setupHandlers()
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: TOOL_DEFINITIONS,
      }
    })

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      try {
        if (!this.client) {
          throw new Error(
            'Client not initialized. Please set environment variables: UPTIME_KUMA_URL and either (UPTIME_KUMA_USERNAME + UPTIME_KUMA_PASSWORD) or UPTIME_KUMA_API_KEY',
          )
        }

        switch (request.params.name) {
          case 'add_monitor': {
            const input = AddMonitorInputSchema.parse(request.params.arguments)
            const monitor = await this.client.addMonitor(input)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(monitor, null, 2),
                },
              ],
            }
          }

          case 'update_monitor': {
            const input = UpdateMonitorInputSchema.parse(request.params.arguments)
            const monitor = await this.client.updateMonitor(input)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(monitor, null, 2),
                },
              ],
            }
          }

          case 'remove_monitor': {
            const input = RemoveMonitorInputSchema.parse(request.params.arguments)
            await this.client.removeMonitor(input.id)
            return {
              content: [
                {
                  type: 'text',
                  text: `Monitor ${input.id} removed successfully`,
                },
              ],
            }
          }

          case 'pause_monitor': {
            const input = PauseMonitorInputSchema.parse(request.params.arguments)
            await this.client.pauseMonitor(input.id)
            return {
              content: [
                {
                  type: 'text',
                  text: `Monitor ${input.id} paused successfully`,
                },
              ],
            }
          }

          case 'resume_monitor': {
            const input = ResumeMonitorInputSchema.parse(request.params.arguments)
            await this.client.resumeMonitor(input.id)
            return {
              content: [
                {
                  type: 'text',
                  text: `Monitor ${input.id} resumed successfully`,
                },
              ],
            }
          }

          case 'get_monitor': {
            const input = GetMonitorInputSchema.parse(request.params.arguments)
            const monitor = await this.client.getMonitor(input.id)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(monitor, null, 2),
                },
              ],
            }
          }

          case 'list_monitors': {
            ListMonitorsInputSchema.parse(request.params.arguments)
            const monitors = await this.client.listMonitors()
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(monitors, null, 2),
                },
              ],
            }
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        }
      }
    })
  }

  private async initializeClient(): Promise<void> {
    const result = AuthConfigSchema.safeParse({
      url: process.env.UPTIME_KUMA_URL,
      username: process.env.UPTIME_KUMA_USERNAME,
      password: process.env.UPTIME_KUMA_PASSWORD,
      apiKey: process.env.UPTIME_KUMA_API_KEY,
    })

    if (!result.success) {
      throw new Error(`Invalid configuration: ${result.error.message}`)
    }

    this.client = new UptimeKumaClient(result.data)
    await this.client.connect()
    await this.client.authenticate()
  }

  async run(): Promise<void> {
    // Initialize client if credentials are provided
    if (process.env.UPTIME_KUMA_URL) {
      try {
        await this.initializeClient()
      } catch (error) {
        console.error('Warning: Failed to initialize Uptime Kuma client:', error)
        console.error(
          'The server will start but tools will fail until valid credentials are provided.',
        )
      }
    }

    const transport = new StdioServerTransport()
    await this.server.connect(transport)

    console.error('Uptime Kuma MCP Server running on stdio')
  }
}

// Start the server
const server = new UptimeKumaMCPServer()
server.run().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
