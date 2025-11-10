import { Server } from '@modelcontextprotocol/sdk/server'
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { UptimeKumaClient } from './api'
import {
  AddMonitorInputSchema,
  type AuthConfig,
  AuthConfigSchema,
  FindMonitorsByNameInputSchema,
  GetMonitorInputSchema,
  ListMonitorsInputSchema,
  PauseMonitorInputSchema,
  RemoveMonitorInputSchema,
  ResumeMonitorInputSchema,
  UpdateMonitorInputSchema,
  zodSchemaToToolInputSchema,
} from './schemas'

const TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'add_monitor',
    description:
      'Add a new monitor to Uptime Kuma. Monitors can check various services like HTTP endpoints, ports, ping, DNS, databases, and more.',
    inputSchema: zodSchemaToToolInputSchema(AddMonitorInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'update_monitor_by_id',
    description: 'Update an existing monitor in Uptime Kuma using its ID',
    inputSchema: zodSchemaToToolInputSchema(UpdateMonitorInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'remove_monitor_by_id',
    description: 'Remove a monitor from Uptime Kuma using its ID',
    inputSchema: zodSchemaToToolInputSchema(RemoveMonitorInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'pause_monitor_by_id',
    description: 'Pause a monitor in Uptime Kuma (stop checking) using its ID',
    inputSchema: zodSchemaToToolInputSchema(PauseMonitorInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'resume_monitor_by_id',
    description: 'Resume a paused monitor in Uptime Kuma (start checking again) using its ID',
    inputSchema: zodSchemaToToolInputSchema(ResumeMonitorInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'get_monitor_by_id',
    description: 'Get details of a specific monitor using its ID',
    inputSchema: zodSchemaToToolInputSchema(GetMonitorInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'find_monitors_by_name',
    description:
      'Find monitors by name or partial name. Returns a list of matching monitors with id, name, url, description, type, path, hostname, port, and active status.',
    inputSchema: zodSchemaToToolInputSchema(FindMonitorsByNameInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'list_monitors',
    description: 'List all monitors in Uptime Kuma',
    inputSchema: zodSchemaToToolInputSchema(ListMonitorsInputSchema) as Tool['inputSchema'],
  },
]

export class UptimeKumaMCPServer {
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

          case 'update_monitor_by_id': {
            const input = UpdateMonitorInputSchema.parse(request.params.arguments)
            const monitor = await this.client.updateMonitorById(input)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(monitor, null, 2),
                },
              ],
            }
          }

          case 'remove_monitor_by_id': {
            const input = RemoveMonitorInputSchema.parse(request.params.arguments)
            await this.client.removeMonitorById(input.id)
            return {
              content: [
                {
                  type: 'text',
                  text: `Monitor ${input.id} removed successfully`,
                },
              ],
            }
          }

          case 'pause_monitor_by_id': {
            const input = PauseMonitorInputSchema.parse(request.params.arguments)
            await this.client.pauseMonitorById(input.id)
            return {
              content: [
                {
                  type: 'text',
                  text: `Monitor ${input.id} paused successfully`,
                },
              ],
            }
          }

          case 'resume_monitor_by_id': {
            const input = ResumeMonitorInputSchema.parse(request.params.arguments)
            await this.client.resumeMonitorById(input.id)
            return {
              content: [
                {
                  type: 'text',
                  text: `Monitor ${input.id} resumed successfully`,
                },
              ],
            }
          }

          case 'get_monitor_by_id': {
            const input = GetMonitorInputSchema.parse(request.params.arguments)
            const monitor = await this.client.getMonitorById(input.id)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(monitor, null, 2),
                },
              ],
            }
          }

          case 'find_monitors_by_name': {
            const input = FindMonitorsByNameInputSchema.parse(request.params.arguments)
            const monitors = await this.client.findMonitorsByName(input.searchTerm, input.useRegex)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(monitors, null, 2),
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

  async initializeClient(config: AuthConfig): Promise<void> {
    const result = AuthConfigSchema.safeParse(config)

    if (!result.success) {
      throw new Error(`Invalid configuration: ${result.error.message}`)
    }

    this.client = new UptimeKumaClient(result.data)
    await this.client.connect()
    await this.client.authenticate()
  }

  getServer(): Server {
    return this.server
  }
}
