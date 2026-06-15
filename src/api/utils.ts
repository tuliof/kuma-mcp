import type { AddMonitorInput, MonitorType, UpdateMonitorInput } from './schemas.js'

// Common fields shared across all monitor types
const COMMON_FIELDS = [
  'name',
  'type',
  'interval',
  'retryInterval',
  'maxretries',
  'notificationIDList',
  'active',
  'description',
  'parent',
]

// Fields for monitors with URL (HTTP-based)
const URL_BASED_FIELDS = [
  'url',
  'timeout',
  'method',
  'headers',
  'body',
  'upsideDown',
  'expiryNotification',
  'ignoreTls',
  'maxredirects',
  'accepted_statuscodes',
  'ipFamily',
  'proxyId',
]

// Fields for monitors with hostname/port
const HOSTNAME_PORT_FIELDS = ['hostname', 'port', 'upsideDown']

// Helper function to merge field arrays into a Set
const mergeFields = (...fieldArrays: string[][]): Set<string> => {
  return new Set(fieldArrays.flat())
}

// Define which fields are relevant for each monitor type
export const MONITOR_TYPE_FIELDS: Record<MonitorType, Set<string>> = {
  http: mergeFields(COMMON_FIELDS, URL_BASED_FIELDS, ['keyword', 'invertKeyword', 'cacheBust']),
  'json-query': mergeFields(COMMON_FIELDS, URL_BASED_FIELDS, [
    'jsonPath',
    'jsonPathOperator',
    'expectedValue',
  ]),
  keyword: mergeFields(COMMON_FIELDS, URL_BASED_FIELDS, ['keyword', 'invertKeyword']),
  'grpc-keyword': mergeFields(COMMON_FIELDS, [
    'url',
    'timeout',
    'keyword',
    'invertKeyword',
    'upsideDown',
  ]),
  port: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  ping: mergeFields(COMMON_FIELDS, [
    'hostname',
    'upsideDown',
    'packetSize',
    'ping_count',
    'ping_numeric',
    'ping_per_request_timeout',
  ]),
  dns: mergeFields(COMMON_FIELDS, [
    'hostname',
    'upsideDown',
    'dns_resolve_server',
    'dns_resolve_type',
  ]),
  docker: mergeFields(COMMON_FIELDS, ['hostname', 'upsideDown']),
  push: mergeFields(COMMON_FIELDS, ['upsideDown']),
  steam: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  mqtt: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  'kafka-producer': mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  sqlserver: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  postgres: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  mysql: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  mongodb: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  radius: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  redis: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  group: mergeFields(COMMON_FIELDS, ['upsideDown']),
  gamedig: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  'tailscale-ping': mergeFields(COMMON_FIELDS, ['hostname', 'upsideDown']),
}

/**
 * Transform and filter monitor payload to match Uptime Kuma's expected format
 * Only includes fields relevant to the specific monitor type
 */
export function transformMonitorPayload(
  input: AddMonitorInput | UpdateMonitorInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  // If we have a type, use it to filter fields
  if (input.type) {
    const monitorType = input.type as MonitorType
    const allowedFields = MONITOR_TYPE_FIELDS[monitorType]

    for (const [key, value] of Object.entries(input)) {
      // Skip undefined values and fields not allowed for this monitor type
      if (value === undefined || (key !== 'id' && !allowedFields.has(key))) {
        continue
      }

      payload[key] = value
    }
  } else {
    // For updates without type, just copy all defined values
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        payload[key] = value
      }
    }
  }

  // Ensure required fields have default values if not provided (only for new monitors)
  if (input.type && !('id' in input)) {
    if (!('notificationIDList' in payload)) {
      // biome-ignore lint/complexity/useLiteralKeys: Trying to figure out the type coming from Uptime
      payload['notificationIDList'] = {}
    }
    if (!('accepted_statuscodes' in payload)) {
      // biome-ignore lint/complexity/useLiteralKeys: Trying to figure out the type coming from Uptime
      payload['accepted_statuscodes'] = ['200-299']
    }
    if (!('conditions' in payload)) {
      // biome-ignore lint/complexity/useLiteralKeys: Trying to figure out the type coming from Uptime
      payload['conditions'] = []
    }
  }

  return payload
}
