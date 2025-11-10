import { z } from 'zod'

export const AuthConfigSchema = z.object({
  url: z.url(),
  username: z.string().optional(),
  password: z.string().optional(),
  apiKey: z.string().optional(),
})

export type AuthConfig = z.infer<typeof AuthConfigSchema>

// Monitor type enum matching uptime-kuma types
export const MonitorTypeSchema = z.enum([
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
])

export type MonitorType = z.infer<typeof MonitorTypeSchema>

// Define required fields per monitor type for smart validation
const MONITOR_TYPE_REQUIRED_FIELDS: Record<MonitorType, Set<string>> = {
  http: new Set(['url']),
  'json-query': new Set(['url', 'jsonPath', 'jsonPathOperator', 'expectedValue']),
  keyword: new Set(['url', 'keyword']),
  'grpc-keyword': new Set(['url', 'keyword']),
  port: new Set(['hostname', 'port']),
  ping: new Set(['hostname']),
  dns: new Set(['hostname']),
  docker: new Set(['hostname']),
  push: new Set([]), // Push monitors don't require additional fields
  steam: new Set(['hostname', 'port']),
  mqtt: new Set(['hostname', 'port']),
  'kafka-producer': new Set(['hostname', 'port']),
  sqlserver: new Set(['hostname', 'port']),
  postgres: new Set(['hostname', 'port']),
  mysql: new Set(['hostname', 'port']),
  mongodb: new Set(['hostname', 'port']),
  radius: new Set(['hostname', 'port']),
  redis: new Set(['hostname', 'port']),
  group: new Set([]), // Group monitors don't require additional fields
  gamedig: new Set(['hostname', 'port']),
  'tailscale-ping': new Set(['hostname']),
}

// Monitor configuration schema
export const MonitorConfigSchema = z
  .object({
    name: z.string().describe('Name of the monitor'),
    type: MonitorTypeSchema.describe('Type of monitor'),
    url: z.string().optional().describe('URL to monitor (for HTTP monitors)'),
    hostname: z.string().optional().describe('Hostname to monitor'),
    port: z.number().optional().describe('Port number to monitor'),
    interval: z.number().default(60).describe('Heartbeat interval in seconds (default: 60)'),
    retryInterval: z
      .number()
      .default(60)
      .describe('Heartbeat retry interval in seconds (default: 60)'),
    maxretries: z
      .number()
      .default(0)
      .describe('Maximum retries before the service is marked as down and a notification is sent'),
    resendInterval: z
      .number()
      .default(0)
      .describe('Resend Notification if Down X times consecutively (default: 0 - no resend)'),
    notificationIDList: z
      .record(z.string(), z.any())
      .default({})
      .describe('Object mapping notification IDs to their settings'),
    active: z.boolean().default(true).describe('Whether the monitor is active (default: true)'),
    requestTimeout: z.number().default(48).describe('Request timeout in seconds (default: 48)'),
    method: z.string().optional().describe('HTTP method (GET, POST, etc.)'),
    headers: z.string().optional().describe('HTTP headers as JSON string'),
    body: z.string().optional().describe('HTTP request body'),
    keyword: z.string().optional().describe('Keyword to search for in response'),
    invertKeyword: z.boolean().optional().describe('Invert keyword match'),
    // JSON Query fields
    jsonPath: z.string().optional().describe('JSON path expression to query (for json-query type)'),
    jsonPathOperator: z
      .enum(['==', '!=', '>', '>=', '<', '<=', 'contains'])
      .optional()
      .describe('Comparison operator for JSON query (for json-query type)'),
    expectedValue: z
      .string()
      .optional()
      .describe('Expected value for JSON query comparison (for json-query type)'),
    upsideDown: z
      .boolean()
      .default(false)
      .describe('Flip the status upside down. If the service is reachable, it is DOWN'),
    // HTTP/HTTPS monitor advanced fields
    expiryNotification: z
      .boolean()
      .default(false)
      .describe('Certificate Expiry Notification - Send notification when TLS certificate expires'),
    ignoreTls: z.boolean().default(false).describe('Ignore TLS/SSL errors for HTTPS websites'),
    uptimeKumaCachebuster: z
      .boolean()
      .default(false)
      .describe(
        'Add the uptime_kuma_cachebuster parameter - Randomly generated parameter to skip caches',
      ),
    maxredirects: z
      .number()
      .default(10)
      .describe('Maximum number of redirects to follow. Set to 0 to disable redirects'),
    accepted_statuscodes: z
      .array(z.string())
      .default(['200-299'])
      .describe(
        'Accepted Status Codes - Select status codes which are considered as a successful response. Can be ranges (e.g., "200-299") or individual codes (e.g., "200"). Default: ["200-299"]',
      ),
    ipFamily: z
      .enum(['ipv4', 'ipv6'])
      .nullable()
      .optional()
      .describe(
        'IP Family - Uses the Happy Eyeballs algorithm for determining the IP family. null for auto-select (default), "ipv4" for IPv4 only, "ipv6" for IPv6 only',
      ),
    proxyId: z.number().optional().describe('Proxy ID to use for this monitor'),
    dns_resolve_server: z.string().optional().describe('DNS server to use for resolution'),
    dns_resolve_type: z.string().optional().describe('DNS record type to query'),
    description: z.string().optional().describe('Monitor description'),
    parent: z.number().optional().describe('Parent monitor ID (for grouping)'),
    pathName: z.string().optional().describe('Path name for the monitor'),
    // Ping monitor advanced fields
    packetSize: z
      .number()
      .default(56)
      .describe('Packet Size - Number of data bytes to be sent (default: 56)'),
    maxPackets: z
      .number()
      .default(1)
      .describe('Max Packets - Number of packets to send before stopping (default: 1)'),
    numericOutput: z
      .boolean()
      .default(false)
      .describe(
        'Numeric Output - If checked, IP addresses will be output instead of symbolic hostnames',
      ),
    perPingTimeout: z
      .number()
      .default(2)
      .describe(
        'Per-Ping Timeout - This is the maximum waiting time (in seconds) before considering a single ping packet lost',
      ),
  })
  .superRefine((data, ctx) => {
    // Get required fields for this monitor type
    const requiredFields = MONITOR_TYPE_REQUIRED_FIELDS[data.type]

    // Check each required field and add issues for missing ones
    for (const field of requiredFields) {
      if (data[field as keyof typeof data] === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `${field} is required for ${data.type} monitor type`,
          path: [field],
        })
      }
    }
  })

export type MonitorConfig = z.infer<typeof MonitorConfigSchema>

// Monitor summary type for search results
export const MonitorSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string().optional(),
  description: z.string().optional(),
  type: z.string(),
  pathName: z.string().optional(),
  hostname: z.string().optional(),
  port: z.number().optional(),
  active: z.boolean(),
})

export type MonitorSummary = z.infer<typeof MonitorSummarySchema>

// Tool input schemas
export const AddMonitorInputSchema = MonitorConfigSchema

export const UpdateMonitorInputSchema = z.object({
  id: z.number(),
  ...MonitorConfigSchema.partial().shape,
})

export const RemoveMonitorInputSchema = z.object({
  id: z.number(),
})

export const PauseMonitorInputSchema = z.object({
  id: z.number(),
})

export const ResumeMonitorInputSchema = z.object({
  id: z.number(),
})

export const GetMonitorInputSchema = z.object({
  id: z.number(),
})

export const FindMonitorsByNameInputSchema = z.object({
  searchTerm: z
    .string()
    .describe(
      'Name or partial name to search for. Can be a plain string (case-insensitive partial match) or a regular expression pattern (e.g., "^prod-.*" to match monitors starting with "prod-", or "api|web" to match monitors containing "api" or "web")',
    ),
  useRegex: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'If true, searchTerm will be treated as a regular expression pattern. Default is false (plain string search)',
    ),
})

// Utility function to generate MCP tool input schema from Zod schema
export function zodSchemaToToolInputSchema(schema: z.ZodObject<any>) {
  return z.toJSONSchema(schema)
}

// # Input schemas
export const ListMonitorsInputSchema = z.object({})

export type AddMonitorInput = z.infer<typeof AddMonitorInputSchema>
export type UpdateMonitorInput = z.infer<typeof UpdateMonitorInputSchema>
export type RemoveMonitorInput = z.infer<typeof RemoveMonitorInputSchema>
export type PauseMonitorInput = z.infer<typeof PauseMonitorInputSchema>
export type ResumeMonitorInput = z.infer<typeof ResumeMonitorInputSchema>
export type GetMonitorInput = z.infer<typeof GetMonitorInputSchema>
export type FindMonitorsByNameInput = z.infer<typeof FindMonitorsByNameInputSchema>
export type ListMonitorsInput = z.infer<typeof ListMonitorsInputSchema>

// # Output schemas

export const BaseResponseSchema = z.object({
  ok: z.boolean(),
  msg: z.string().optional(),
})

export type BaseResponse = z.infer<typeof BaseResponseSchema>
