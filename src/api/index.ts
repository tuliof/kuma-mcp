import { io, type Socket } from 'socket.io-client'
import type { AuthConfig } from './schemas.js'
import type { LoginResponse } from './types.js'

// Re-export types
export type { Monitor } from './types.js'

// Import monitor operations
import * as monitors from './monitors.js'

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

  private getContext() {
    if (!this.socket) {
      throw new Error('Socket not connected')
    }
    return {
      socket: this.socket,
      authenticated: this.authenticated,
    }
  }

  // Monitor operations
  async addMonitor(monitor: Parameters<typeof monitors.addMonitor>[1]) {
    await this.ensureAuthenticated()
    return monitors.addMonitor(this.getContext(), monitor)
  }

  async updateMonitorById(input: Parameters<typeof monitors.updateMonitorById>[1]) {
    await this.ensureAuthenticated()
    return monitors.updateMonitorById(this.getContext(), input)
  }

  async removeMonitorById(id: number) {
    await this.ensureAuthenticated()
    return monitors.removeMonitorById(this.getContext(), id)
  }

  async pauseMonitorById(id: number) {
    await this.ensureAuthenticated()
    return monitors.pauseMonitorById(this.getContext(), id)
  }

  async resumeMonitorById(id: number) {
    await this.ensureAuthenticated()
    return monitors.resumeMonitorById(this.getContext(), id)
  }

  async getMonitorById(id: number) {
    await this.ensureAuthenticated()
    return monitors.getMonitorById(this.getContext(), id)
  }

  async listMonitors() {
    await this.ensureAuthenticated()
    return monitors.listMonitors(this.getContext())
  }

  async findMonitorsByName(searchTerm: string, useRegex: boolean = false) {
    await this.ensureAuthenticated()
    return monitors.findMonitorsByName(this.getContext(), searchTerm, useRegex)
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.authenticated = false
    }
  }
}

// Export all schemas and types from schemas.ts
export {
  AuthConfigSchema,
  MonitorTypeSchema,
  MonitorConfigSchema,
  MonitorSummarySchema,
  AddMonitorInputSchema,
  UpdateMonitorInputSchema,
  RemoveMonitorInputSchema,
  PauseMonitorInputSchema,
  ResumeMonitorInputSchema,
  GetMonitorInputSchema,
  FindMonitorsByNameInputSchema,
  ListMonitorsInputSchema,
  BaseResponseSchema,
  zodSchemaToToolInputSchema,
} from './schemas.js'

export type {
  AuthConfig,
  MonitorType,
  MonitorConfig,
  MonitorSummary,
  AddMonitorInput,
  UpdateMonitorInput,
  RemoveMonitorInput,
  PauseMonitorInput,
  ResumeMonitorInput,
  GetMonitorInput,
  FindMonitorsByNameInput,
  ListMonitorsInput,
  BaseResponse,
} from './schemas.js'

// Export environment configuration
export { env } from './env.js'
