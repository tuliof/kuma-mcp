import type { Socket } from 'socket.io-client'
import type { MonitorConfig } from './schemas.js'

export interface Monitor extends MonitorConfig {
  id: number
}

export interface LoginResponse {
  ok: boolean
  token?: string
  msg?: string
}

export interface ApiResponse {
  ok: boolean
  msg?: string
}

export interface SocketContext {
  socket: Socket
  authenticated: boolean
}
