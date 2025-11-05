import { io, type Socket } from 'socket.io-client'
import type { AddMonitorInput, AuthConfig, MonitorConfig, UpdateMonitorInput, MonitorType } from './schemas.js'

interface Monitor extends MonitorConfig {
  id: number
}

interface LoginResponse {
  ok: boolean
  token?: string
  msg?: string
}

// Define which fields are relevant for each monitor type
const MONITOR_TYPE_FIELDS: Record<MonitorType, Set<string>> = {
  http: new Set([
    'name', 'type', 'url', 'interval', 'retryInterval', 'maxretries',
    'notificationIDList', 'active', 'requestTimeout', 'method', 'headers', 'body',
    'keyword', 'invertKeyword', 'upsideDown', 'expiryNotification', 'ignoreTls',
    'uptimeKumaCachebuster', 'maxredirects', 'accepted_statuscodes', 'ipFamily',
    'proxyId', 'description', 'parent', 'pathName'
  ]),
  'json-query': new Set([
    'name', 'type', 'url', 'interval', 'retryInterval', 'maxretries',
    'notificationIDList', 'active', 'requestTimeout', 'method', 'headers', 'body',
    'jsonPath', 'jsonPathOperator', 'expectedValue', 'upsideDown', 'expiryNotification',
    'ignoreTls', 'maxredirects', 'accepted_statuscodes', 'ipFamily', 'proxyId',
    'description', 'parent', 'pathName'
  ]),
  keyword: new Set([
    'name', 'type', 'url', 'interval', 'retryInterval', 'maxretries',
    'notificationIDList', 'active', 'requestTimeout', 'method', 'headers', 'body',
    'keyword', 'invertKeyword', 'upsideDown', 'expiryNotification', 'ignoreTls',
    'maxredirects', 'accepted_statuscodes', 'ipFamily', 'proxyId', 'description',
    'parent', 'pathName'
  ]),
  'grpc-keyword': new Set([
    'name', 'type', 'url', 'interval', 'retryInterval', 'maxretries',
    'notificationIDList', 'active', 'requestTimeout', 'keyword', 'invertKeyword',
    'upsideDown', 'description', 'parent', 'pathName'
  ]),
  port: new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  ping: new Set([
    'name', 'type', 'hostname', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'packetSize',
    'maxPackets', 'numericOutput', 'perPingTimeout', 'description', 'parent', 'pathName'
  ]),
  dns: new Set([
    'name', 'type', 'hostname', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'dns_resolve_server',
    'dns_resolve_type', 'description', 'parent', 'pathName'
  ]),
  docker: new Set([
    'name', 'type', 'hostname', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  push: new Set([
    'name', 'type', 'interval', 'retryInterval', 'maxretries',
    'notificationIDList', 'active', 'upsideDown', 'description', 'parent', 'pathName'
  ]),
  steam: new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  mqtt: new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  'kafka-producer': new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  sqlserver: new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  postgres: new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  mysql: new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  mongodb: new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  radius: new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  redis: new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  group: new Set([
    'name', 'type', 'interval', 'retryInterval', 'maxretries',
    'notificationIDList', 'active', 'upsideDown', 'description', 'parent', 'pathName'
  ]),
  gamedig: new Set([
    'name', 'type', 'hostname', 'port', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
  'tailscale-ping': new Set([
    'name', 'type', 'hostname', 'interval', 'retryInterval',
    'maxretries', 'notificationIDList', 'active', 'upsideDown', 'description',
    'parent', 'pathName'
  ]),
}

/**
 * Transform and filter monitor payload to match Uptime Kuma's expected format
 * Only includes fields relevant to the specific monitor type
 */
function transformMonitorPayload(input: AddMonitorInput | UpdateMonitorInput): Record<string, any> {
  const payload: Record<string, any> = {}

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
        reject(new Error(`Connection failed: ${error.message}`))
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
        reject(new Error('Socket not connected'))
        return
      }

      if (this.config.apiKey) {
        // Authenticate with API key
        this.socket.emit('loginByToken', this.config.apiKey, (response: LoginResponse) => {
          if (response.ok) {
            this.authenticated = true
            resolve()
          } else {
            reject(new Error(`Authentication failed: ${response.msg || 'Unknown error'}`))
          }
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
            if (response.ok) {
              this.authenticated = true
              resolve()
            } else {
              reject(new Error(`Authentication failed: ${response.msg || 'Unknown error'}`))
            }
          },
        )
      } else {
        reject(new Error('No authentication credentials provided'))
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
        reject(new Error('Socket not connected'))
        return
      }

      const payload = transformMonitorPayload(monitor)

      this.socket.emit(
        'add',
        payload,
        (response: { ok: boolean; msg?: string; monitorID?: number }) => {
          if (response.ok && response.monitorID) {
            resolve({ ...monitor, id: response.monitorID })
          } else {
            reject(new Error(`Failed to add monitor: ${response.msg || 'Unknown error'}`))
          }
        },
      )
    })
  }

  async updateMonitor(input: UpdateMonitorInput): Promise<Monitor> {
    await this.ensureAuthenticated()

    return new Promise(async (resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'))
        return
      }

      try {
        // Fetch the existing monitor to get all current fields
        const existingMonitor = await this.getMonitor(input.id)

        // Merge the update with existing monitor data
        const payload = {
          ...existingMonitor,
          ...transformMonitorPayload(input),
        }

        this.socket.emit('editMonitor', payload, async (response: { ok: boolean; msg?: string }) => {
          if (response.ok) {
            // Fetch the updated monitor to return complete data
            try {
              const monitor = await this.getMonitor(input.id)
              resolve(monitor)
            } catch (error) {
              // If fetching fails, propagate the error instead of returning potentially incomplete data
              reject(
                new Error(
                  `Failed to fetch updated monitor after edit: ${error instanceof Error ? error.message : String(error)}`,
                ),
              )
            }
          } else {
            reject(new Error(`Failed to update monitor: ${response.msg || 'Unknown error'}`))
          }
        })
      } catch (error) {
        reject(new Error(`Failed to fetch existing monitor: ${error instanceof Error ? error.message : String(error)}`))
      }
    })
  }

  async removeMonitor(id: number): Promise<void> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'))
        return
      }

      this.socket.emit('deleteMonitor', id, (response: { ok: boolean; msg?: string }) => {
        if (response.ok) {
          resolve()
        } else {
          reject(new Error(`Failed to remove monitor: ${response.msg || 'Unknown error'}`))
        }
      })
    })
  }

  async pauseMonitor(id: number): Promise<void> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'))
        return
      }

      this.socket.emit('pauseMonitor', id, (response: { ok: boolean; msg?: string }) => {
        if (response.ok) {
          resolve()
        } else {
          reject(new Error(`Failed to pause monitor: ${response.msg || 'Unknown error'}`))
        }
      })
    })
  }

  async resumeMonitor(id: number): Promise<void> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'))
        return
      }

      this.socket.emit('resumeMonitor', id, (response: { ok: boolean; msg?: string }) => {
        if (response.ok) {
          resolve()
        } else {
          reject(new Error(`Failed to resume monitor: ${response.msg || 'Unknown error'}`))
        }
      })
    })
  }

  async getMonitor(id: number): Promise<Monitor> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'))
        return
      }

      this.socket.emit(
        'getMonitor',
        id,
        (response: { ok: boolean; monitor?: Monitor; msg?: string }) => {
          if (response.ok && response.monitor) {
            resolve(response.monitor)
          } else {
            reject(new Error(`Failed to get monitor: ${response.msg || 'Unknown error'}`))
          }
        },
      )
    })
  }

  async listMonitors(): Promise<Monitor[]> {
    await this.ensureAuthenticated()

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'))
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
          reject(new Error(`Failed to request monitors: ${response.msg || 'Unknown error'}`))
        }
      })

      // Add a timeout in case the event never arrives
      setTimeout(() => {
        this.socket?.off('monitorList', handleMonitorList)
        reject(new Error('Timeout waiting for monitor list'))
      }, 10000)
    })
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.authenticated = false
    }
  }
}
