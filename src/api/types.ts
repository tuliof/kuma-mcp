import type { Socket } from 'socket.io-client'
import type { MonitorConfig } from './schemas.js'

export interface Monitor extends MonitorConfig {
  id: number
  pathName?: string
  tags?: MonitorTag[]
}

export interface Tag {
  id: number
  name: string
  color: string
}

export interface MonitorTag {
  tag_id: number
  monitor_id: number
  value: string | null
  name: string
  color: string
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

export interface BulkRemoveResult {
  removed: number
  monitors: BulkActionResult[]
}

export type MonitorStatusLabel = 'up' | 'down' | 'pending' | 'maintenance' | 'paused' | 'unknown'

export interface HeartbeatRecord {
  id: number
  monitorId: number
  status: number
  time: string
  msg: string | null
  ping: number | null
  important: boolean
  duration: number
  retries: number
}

export interface LatestHeartbeat {
  status: MonitorStatusLabel
  time: string
  msg: string | null
  ping: number | null
}

export interface MonitorStatusResult {
  id: number
  name: string
  active: boolean
  status: MonitorStatusLabel
  uptime24h: number | null
  avgPing24h: number | null
  totalHeartbeats24h: number
  recentOutages24h: number
  latestHeartbeat: LatestHeartbeat | null
}

export interface MonitorSummaryResult {
  id: number
  name: string
  active: boolean
  status: MonitorStatusLabel
  uptime24h: number | null
  avgPing24h: number | null
  totalHeartbeats24h: number
  recentOutages24h: number
  latestHeartbeat: LatestHeartbeat | null
}
