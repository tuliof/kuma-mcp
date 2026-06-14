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

export interface BulkActionResult {
  id: number
  name: string
}

export interface BulkPauseResult {
  paused: number
  monitors: BulkActionResult[]
}

export interface BulkResumeResult {
  resumed: number
  monitors: BulkActionResult[]
}

export interface BulkUpdateResultItem {
  id: number
  success: boolean
  error?: string
}

export interface BulkUpdateResult {
  updated: number
  failed: number
  results: BulkUpdateResultItem[]
}
