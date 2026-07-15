import { Server } from '@modelcontextprotocol/sdk/server'
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import {
  AddMonitorInputSchema,
  AddMonitorTagInputSchema,
  AddTagInputSchema,
  type AuthConfig,
  AuthConfigSchema,
  BulkUpdateMonitorsInputSchema,
  DeleteMonitorTagInputSchema,
  DeleteTagInputSchema,
  EditMonitorTagInputSchema,
  EditTagInputSchema,
  EmptyInputSchema,
  FindMonitorsByNameInputSchema,
  GetMonitorHeartbeatsInputSchema,
  GetMonitorStatusInputSchema,
  GetMonitorSummaryInputSchema,
  GetMonitorsByStatusInputSchema,
  IdsInputSchema,
  ListMonitorsInputSchema,
  UpdateMonitorInputSchema,
  UptimeKumaClient,
  zodSchemaToToolInputSchema,
} from './api/index.js'

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
  {
    name: 'get_monitors',
    description: 'Get details of specific monitors using their IDs',
    inputSchema: zodSchemaToToolInputSchema(IdsInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'pause_monitors',
    description: 'Pause monitors in Uptime Kuma (stop checking) using their IDs',
    inputSchema: zodSchemaToToolInputSchema(IdsInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'resume_monitors',
    description: 'Resume paused monitors in Uptime Kuma (start checking again) using their IDs',
    inputSchema: zodSchemaToToolInputSchema(IdsInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'remove_monitors',
    description: 'Remove monitors from Uptime Kuma using their IDs',
    inputSchema: zodSchemaToToolInputSchema(IdsInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'bulk_update_monitors',
    description:
      'Update multiple monitors at once by their IDs. Partial failures are reported per monitor.',
    inputSchema: zodSchemaToToolInputSchema(BulkUpdateMonitorsInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'get_monitor_status',
    description:
      'Get current status of a monitor. Can look up by ID or by name/regex. Returns status (up/down/pending/maintenance/paused/unknown) and latest heartbeat info.',
    inputSchema: zodSchemaToToolInputSchema(GetMonitorStatusInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'get_monitors_by_status',
    description:
      'Find all monitors with a given status (up, down, pending, maintenance, paused, unknown). Returns matching monitors with their current status info.',
    inputSchema: zodSchemaToToolInputSchema(GetMonitorsByStatusInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'get_monitor_heartbeats_by_id',
    description:
      'Get raw heartbeat records for a monitor. Each heartbeat contains a timestamp, status, ping response time, and response message. Use this for detailed monitoring history.',
    inputSchema: zodSchemaToToolInputSchema(GetMonitorHeartbeatsInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'get_monitor_summary_by_id',
    description:
      "Get an aggregated summary of a monitor's health over the last 24 hours. Returns uptime percentage, average ping, total heartbeats, and recent outage count. Use this for a quick health overview.",
    inputSchema: zodSchemaToToolInputSchema(GetMonitorSummaryInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'get_tags',
    description: 'List all tag definitions in Uptime Kuma. Each tag has an id, name, and color.',
    inputSchema: zodSchemaToToolInputSchema(EmptyInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'add_tag',
    description: 'Create a new tag with a name and hex color (e.g., "#059669").',
    inputSchema: zodSchemaToToolInputSchema(AddTagInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'edit_tag',
    description: 'Update an existing tag name and/or color by its ID.',
    inputSchema: zodSchemaToToolInputSchema(EditTagInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'delete_tag',
    description: 'Delete a tag by its ID. This also removes the tag from all monitors.',
    inputSchema: zodSchemaToToolInputSchema(DeleteTagInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'add_monitor_tag',
    description:
      'Attach a tag to a monitor. An optional value can be set for the tag-monitor association.',
    inputSchema: zodSchemaToToolInputSchema(AddMonitorTagInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'edit_monitor_tag',
    description: 'Update the value of an existing tag-monitor association.',
    inputSchema: zodSchemaToToolInputSchema(EditMonitorTagInputSchema) as Tool['inputSchema'],
  },
  {
    name: 'delete_monitor_tag',
    description: 'Remove a tag from a monitor.',
    inputSchema: zodSchemaToToolInputSchema(DeleteMonitorTagInputSchema) as Tool['inputSchema'],
  },
]

export class UptimeKumaMCPServer {
  private server: Server
  private client: UptimeKumaClient | null = null

  constructor() {
    this.server = new Server(
      {
        name: 'kuma-mcp',
        version: '0.1.0',
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
            'Client not initialized. Please set environment variables: UPTIME_KUMA_URL, UPTIME_KUMA_USERNAME, and UPTIME_KUMA_PASSWORD',
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

          case 'get_monitors': {
            const input = IdsInputSchema.parse(request.params.arguments)
            const monitors = await this.client.getMonitors(input.ids)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(monitors, null, 2),
                },
              ],
            }
          }

          case 'pause_monitors': {
            const input = IdsInputSchema.parse(request.params.arguments)
            const result = await this.client.pauseMonitors(input.ids)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          }

          case 'resume_monitors': {
            const input = IdsInputSchema.parse(request.params.arguments)
            const result = await this.client.resumeMonitors(input.ids)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          }

          case 'remove_monitors': {
            const input = IdsInputSchema.parse(request.params.arguments)
            const result = await this.client.removeMonitors(input.ids)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          }

          case 'bulk_update_monitors': {
            const input = BulkUpdateMonitorsInputSchema.parse(request.params.arguments)
            const result = await this.client.bulkUpdateMonitors(input.ids, input.updates)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            }
          }

          case 'get_monitor_status': {
            const input = GetMonitorStatusInputSchema.parse(request.params.arguments)
            const result = await this.client.getMonitorStatus(input)
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            }
          }

          case 'get_monitors_by_status': {
            const input = GetMonitorsByStatusInputSchema.parse(request.params.arguments)
            const result = await this.client.getMonitorsByStatus(input.status)
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            }
          }

          case 'get_monitor_heartbeats_by_id': {
            const input = GetMonitorHeartbeatsInputSchema.parse(request.params.arguments)
            const result = await this.client.getMonitorHeartbeatsById(input.id, input.hours)
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            }
          }

          case 'get_monitor_summary_by_id': {
            const input = GetMonitorSummaryInputSchema.parse(request.params.arguments)
            const result = await this.client.getMonitorSummaryById(input.id)
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            }
          }

          case 'get_tags': {
            const result = await this.client.getTags()
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            }
          }

          case 'add_tag': {
            const input = AddTagInputSchema.parse(request.params.arguments)
            const result = await this.client.addTag(input)
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            }
          }

          case 'edit_tag': {
            const input = EditTagInputSchema.parse(request.params.arguments)
            const result = await this.client.editTag(input)
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            }
          }

          case 'delete_tag': {
            const input = DeleteTagInputSchema.parse(request.params.arguments)
            await this.client.deleteTag(input)
            return {
              content: [{ type: 'text', text: JSON.stringify({ deleted: true, id: input.id }) }],
            }
          }

          case 'add_monitor_tag': {
            const input = AddMonitorTagInputSchema.parse(request.params.arguments)
            await this.client.addMonitorTag(input)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    added: true,
                    tagId: input.tagId,
                    monitorId: input.monitorId,
                  }),
                },
              ],
            }
          }

          case 'edit_monitor_tag': {
            const input = EditMonitorTagInputSchema.parse(request.params.arguments)
            await this.client.editMonitorTag(input)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    updated: true,
                    tagId: input.tagId,
                    monitorId: input.monitorId,
                  }),
                },
              ],
            }
          }

          case 'delete_monitor_tag': {
            const input = DeleteMonitorTagInputSchema.parse(request.params.arguments)
            await this.client.deleteMonitorTag(input)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    removed: true,
                    tagId: input.tagId,
                    monitorId: input.monitorId,
                  }),
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
