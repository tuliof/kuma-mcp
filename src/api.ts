import { io, type Socket } from 'socket.io-client'
import type {
  AddMonitorInput,
  AuthConfig,
  MonitorConfig,
  MonitorSummary,
  MonitorType,
  UpdateMonitorInput,
} from './schemas.js'

interface Monitor extends MonitorConfig {
  id: number
}

interface LoginResponse {
  ok: boolean
  token?: string
  msg?: string
}

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
  'pathName',
]

// Fields for monitors with URL (HTTP-based)
const URL_BASED_FIELDS = [
  'url',
  'requestTimeout',
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
const MONITOR_TYPE_FIELDS: Record<MonitorType, Set<string>> = {
  http: mergeFields(COMMON_FIELDS, URL_BASED_FIELDS, [
    'keyword',
    'invertKeyword',
    'uptimeKumaCachebuster',
  ]),
  'json-query': mergeFields(COMMON_FIELDS, URL_BASED_FIELDS, [
    'jsonPath',
    'jsonPathOperator',
    'expectedValue',
  ]),
  keyword: mergeFields(COMMON_FIELDS, URL_BASED_FIELDS, ['keyword', 'invertKeyword']),
  'grpc-keyword': mergeFields(COMMON_FIELDS, [
    'url',
    'requestTimeout',
    'keyword',
    'invertKeyword',
    'upsideDown',
  ]),
  port: mergeFields(COMMON_FIELDS, HOSTNAME_PORT_FIELDS),
  ping: mergeFields(COMMON_FIELDS, [
    'hostname',
    'upsideDown',
    'packetSize',
    'maxPackets',
    'numericOutput',
    'perPingTimeout',
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
function transformMonitorPayload(
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
      payload['notificationIDList'] = {}
    }
    if (!('accepted_statuscodes' in payload)) {
      payload['accepted_statuscodes'] = ['200-299']
    }
    if (!('conditions' in payload)) {
      payload['conditions'] = []
    }
  }

  return payload
}

/**
 * Client for interacting with Uptime Kuma API via Socket.IO
 */
export class UptimeKumaClient {
  private socket: Socket | null = null
  private config: AuthConfig
  private authenticated = false

  constructor(config: AuthConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return
    }

    return new Promise((resolve, reject) => {
      this.socket = io(this.config.url, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 3,
      })

      this.socket.on('connect', () => {
        resolve()
      })

      this.socket.on('connect_error', (error) => {
        reject(`Connection failed: ${error.message}`)
      })

      this.socket.on('disconnect', () => {
        this.authenticated = false
      })
    })
  }

  async authenticate(): Promise<void> {
    if (!this.socket) {
      await this.connect()
    }

    if (this.authenticated) {
      return
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject('Socket not connected')
        return
      }

      if (this.config.apiKey) {
        // Authenticate with API key
        this.socket.emit('loginByToken', this.config.apiKey, (response: LoginResponse) => {
          if (!response.ok) {
            reject(`Authentication failed: ${response.msg || 'Unknown error'}`)
            return
          }
          this.authenticated = true
          resolve()
        })
      } else if (this.config.username && this.config.password) {
        // Authenticate with username/password
        this.socket.emit(
          'login',
          {
            username: this.config.username,
            password: this.config.password,
          },
          (response: LoginResponse) => {
            if (!response.ok) {
              reject(`Authentication failed: ${response.msg || 'Unknown error'}`)
              return
            }
            this.authenticated = true
            resolve()
          },
        )
      } else {
        reject('No authentication credentials provided')
      }
    })
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.authenticated) {
      await this.authenticate()
    }
  }

  async addMonitor(monitor: AddMonitorInput): Promise<Monitor> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject('Socket not connected')
        return
      }

      const payload = transformMonitorPayload(monitor)

      this.socket.emit(
        'add',
        payload,
        (response: { ok: boolean; msg?: string; monitorID?: number }) => {
          if (!response.ok || !response.monitorID) {
            reject(`Failed to add monitor: ${response.msg || 'Unknown error'}`)
            return
          }
          resolve({ ...monitor, id: response.monitorID })
        },
      )
    })
  }

  async updateMonitorById(input: UpdateMonitorInput): Promise<Monitor> {
    await this.ensureAuthenticated()

    if (!this.socket) {
      throw 'Socket not connected'
    }

    // Fetch the existing monitor to get all current fields
    const existingMonitor = await this.getMonitorById(input.id)

    // Merge the update with existing monitor data
    const payload = {
      ...existingMonitor,
      ...transformMonitorPayload(input),
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject('Socket not connected')
        return
      }

      this.socket.emit('editMonitor', payload, async (response: { ok: boolean; msg?: string }) => {
        if (!response.ok) {
          reject(`Failed to update monitor: ${response.msg || 'Unknown error'}`)
          return
        }

        // Fetch the updated monitor to return complete data
        try {
          const monitor = await this.getMonitorById(input.id)
          resolve(monitor)
        } catch (error) {
          reject(
            `Failed to fetch updated monitor after edit: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      })
    })
  }

  async removeMonitorById(id: number): Promise<void> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject('Socket not connected')
        return
      }

      this.socket.emit('deleteMonitor', id, (response: { ok: boolean; msg?: string }) => {
        if (!response.ok) {
          reject(`Failed to remove monitor: ${response.msg || 'Unknown error'}`)
          return
        }
        resolve()
      })
    })
  }

  async pauseMonitorById(id: number): Promise<void> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject('Socket not connected')
        return
      }

      this.socket.emit('pauseMonitor', id, (response: { ok: boolean; msg?: string }) => {
        if (!response.ok) {
          reject(`Failed to pause monitor: ${response.msg || 'Unknown error'}`)
          return
        }
        resolve()
      })
    })
  }

  async resumeMonitorById(id: number): Promise<void> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject('Socket not connected')
        return
      }

      this.socket.emit('resumeMonitor', id, (response: { ok: boolean; msg?: string }) => {
        if (!response.ok) {
          reject(`Failed to resume monitor: ${response.msg || 'Unknown error'}`)
          return
        }
        resolve()
      })
    })
  }

  async getMonitorById(id: number): Promise<Monitor> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject('Socket not connected')
        return
      }

      this.socket.emit(
        'getMonitor',
        id,
        (response: { ok: boolean; monitor?: Monitor; msg?: string }) => {
          if (!response.ok || !response.monitor) {
            reject(`Failed to get monitor: ${response.msg || 'Unknown error'}`)
            return
          }
          resolve(response.monitor)
        },
      )
    })
  }

  async listMonitors(): Promise<Monitor[]> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject('Socket not connected')
        return
      }

      // Listen for the monitorList event which contains the actual data
      const handleMonitorList = (data: Record<string, Monitor>) => {
        this.socket?.off('monitorList', handleMonitorList)
        resolve(Object.values(data))
      }

      this.socket.on('monitorList', handleMonitorList)

      // Request the monitor list
      this.socket.emit('getMonitorList', (response: { ok: boolean; msg?: string }) => {
        if (!response.ok) {
          this.socket?.off('monitorList', handleMonitorList)
          reject(`Failed to request monitors: ${response.msg || 'Unknown error'}`)
        }
      })

      // Add a timeout in case the event never arrives
      setTimeout(() => {
        this.socket?.off('monitorList', handleMonitorList)
        reject('Timeout waiting for monitor list')
      }, 10000)
    })
  }

  async findMonitorsByName(
    searchTerm: string,
    useRegex: boolean = false,
  ): Promise<MonitorSummary[]> {
    await this.ensureAuthenticated()

    const monitors = await this.listMonitors()

    let matchingMonitors: Monitor[]

    if (useRegex) {
      // Use regex pattern matching
      try {
        const regex = new RegExp(searchTerm, 'i') // Case-insensitive by default
        matchingMonitors = monitors.filter((monitor) => regex.test(monitor.name))
      } catch (error) {
        throw `Invalid regular expression pattern: ${error instanceof Error ? error.message : String(error)}`
      }
    } else {
      // Search for monitors matching the name (case-insensitive partial match)
      const searchLower = searchTerm.toLowerCase()
      matchingMonitors = monitors.filter((monitor) =>
        monitor.name.toLowerCase().includes(searchLower),
      )
    }

    // Return only the requested fields
    return matchingMonitors.map((monitor) => ({
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      description: monitor.description,
      type: monitor.type,
      pathName: monitor.pathName,
      hostname: monitor.hostname,
      port: monitor.port,
      active: monitor.active,
    }))
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.authenticated = false
    }
  }
}
