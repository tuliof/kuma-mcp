import type {
  AddMonitorInput,
  GetMonitorStatusInput,
  MonitorConfig,
  MonitorSummary,
  UpdateMonitorInput,
} from './schemas.js'
import type {
  BulkPauseResult,
  BulkResumeResult,
  BulkUpdateResult,
  HeartbeatRecord,
  Monitor,
  MonitorStatusLabel,
  MonitorStatusResult,
  MonitorSummaryResult,
  SocketContext,
} from './types.js'
import { transformMonitorPayload } from './utils.js'

export async function addMonitor(
  context: SocketContext,
  monitor: AddMonitorInput,
): Promise<Monitor> {
  return new Promise((resolve, reject) => {
    const payload = transformMonitorPayload(monitor)

    context.socket.emit(
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

export async function updateMonitorById(
  context: SocketContext,
  input: UpdateMonitorInput,
): Promise<Monitor> {
  // Fetch the existing monitor to get all current fields
  const existingMonitor = await getMonitorById(context, input.id)

  // Merge the update with existing monitor data
  const payload = {
    ...existingMonitor,
    ...transformMonitorPayload(input),
  }

  return new Promise((resolve, reject) => {
    context.socket.emit('editMonitor', payload, async (response: { ok: boolean; msg?: string }) => {
      if (!response.ok) {
        reject(`Failed to update monitor: ${response.msg || 'Unknown error'}`)
        return
      }

      // Fetch the updated monitor to return complete data
      try {
        const monitor = await getMonitorById(context, input.id)
        resolve(monitor)
      } catch (error) {
        reject(
          `Failed to fetch updated monitor after edit: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    })
  })
}

export async function removeMonitorById(context: SocketContext, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    context.socket.emit('deleteMonitor', id, (response: { ok: boolean; msg?: string }) => {
      if (!response.ok) {
        reject(`Failed to remove monitor: ${response.msg || 'Unknown error'}`)
        return
      }
      resolve()
    })
  })
}

export async function pauseMonitorById(context: SocketContext, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    context.socket.emit('pauseMonitor', id, (response: { ok: boolean; msg?: string }) => {
      if (!response.ok) {
        reject(`Failed to pause monitor: ${response.msg || 'Unknown error'}`)
        return
      }
      resolve()
    })
  })
}

export async function resumeMonitorById(context: SocketContext, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    context.socket.emit('resumeMonitor', id, (response: { ok: boolean; msg?: string }) => {
      if (!response.ok) {
        reject(`Failed to resume monitor: ${response.msg || 'Unknown error'}`)
        return
      }
      resolve()
    })
  })
}

export async function getMonitorById(context: SocketContext, id: number): Promise<Monitor> {
  return new Promise((resolve, reject) => {
    context.socket.emit(
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

export async function listMonitors(context: SocketContext): Promise<Monitor[]> {
  return new Promise((resolve, reject) => {
    // Listen for the monitorList event which contains the actual data
    const handleMonitorList = (data: Record<string, Monitor>) => {
      context.socket.off('monitorList', handleMonitorList)
      resolve(Object.values(data))
    }

    context.socket.on('monitorList', handleMonitorList)

    // Request the monitor list
    context.socket.emit('getMonitorList', (response: { ok: boolean; msg?: string }) => {
      if (!response.ok) {
        context.socket.off('monitorList', handleMonitorList)
        reject(`Failed to request monitors: ${response.msg || 'Unknown error'}`)
      }
    })

    // Add a timeout in case the event never arrives
    setTimeout(() => {
      context.socket.off('monitorList', handleMonitorList)
      reject('Timeout waiting for monitor list')
    }, 10000)
  })
}

export async function findMonitorsByName(
  context: SocketContext,
  searchTerm: string,
  useRegex: boolean = false,
): Promise<MonitorSummary[]> {
  const monitors = await listMonitors(context)

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

export async function pauseMonitorsByName(
  context: SocketContext,
  searchTerm: string,
  useRegex: boolean = false,
): Promise<BulkPauseResult> {
  const matches = await findMonitorsByName(context, searchTerm, useRegex)
  const monitors = await Promise.all(
    matches.map(async (m) => {
      await pauseMonitorById(context, m.id)
      return { id: m.id, name: m.name }
    }),
  )
  return { paused: monitors.length, monitors }
}

export async function resumeMonitorsByName(
  context: SocketContext,
  searchTerm: string,
  useRegex: boolean = false,
): Promise<BulkResumeResult> {
  const matches = await findMonitorsByName(context, searchTerm, useRegex)
  const monitors = await Promise.all(
    matches.map(async (m) => {
      await resumeMonitorById(context, m.id)
      return { id: m.id, name: m.name }
    }),
  )
  return { resumed: monitors.length, monitors }
}

export async function bulkUpdateMonitors(
  context: SocketContext,
  ids: number[],
  updates: Partial<MonitorConfig>,
): Promise<BulkUpdateResult> {
  const results: BulkUpdateResult['results'] = []

  for (const id of ids) {
    try {
      await updateMonitorById(context, { id, ...updates })
      results.push({ id, success: true })
    } catch (error) {
      results.push({ id, success: false, error: String(error) })
    }
  }

  return {
    updated: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  }
}

// --- Status & Health ---

const STATUS_MAP: Record<number, MonitorStatusLabel> = {
  0: 'down',
  1: 'up',
  2: 'pending',
  3: 'maintenance',
}

// biome-ignore lint/suspicious/noExplicitAny: socket responses have unknown shape
function normalizeHeartbeat(raw: any): HeartbeatRecord | null {
  if (!raw || typeof raw !== 'object') return null

  const id = raw.id ?? raw._id
  if (id === undefined || id === null) return null

  const monitorId = raw.monitorID ?? raw.monitor_id ?? raw._monitorId ?? 0
  const rawStatus = raw.status ?? raw._status ?? -1
  const rawImportant = raw.important ?? raw._important ?? 0

  return {
    id,
    monitorId,
    status: rawStatus,
    time: raw.time ?? raw._time ?? '',
    msg: raw.msg ?? raw._msg ?? null,
    ping: raw.ping ?? raw._ping ?? null,
    important: rawImportant === 1,
    duration: raw.duration ?? raw._duration ?? 0,
    retries: raw.retries ?? raw._retries ?? 0,
  }
}

function computeStatusLabel(active: boolean, rawStatus: number | null): MonitorStatusLabel {
  if (!active) return 'paused'
  if (rawStatus === null) return 'unknown'
  return STATUS_MAP[rawStatus] ?? 'unknown'
}

export async function getMonitorStatus(
  context: SocketContext,
  input: GetMonitorStatusInput,
): Promise<MonitorStatusResult[]> {
  let monitorIds: number[]

  if (input.id !== undefined) {
    monitorIds = [input.id]
  } else if (input.searchTerm !== undefined) {
    const matches = await findMonitorsByName(context, input.searchTerm, input.useRegex)
    monitorIds = matches.map((m) => m.id)
    if (monitorIds.length === 0) return []
  } else {
    return []
  }

  const results: MonitorStatusResult[] = []

  for (const id of monitorIds) {
    let active = true
    let name = ''

    try {
      const mon = await getMonitorById(context, id)
      active = mon.active ?? true
      name = mon.name
    } catch {
      continue
    }

    const beatsResponse = (await context.socket.emitWithAck('getMonitorBeats', id, 24)) as {
      ok: boolean
      data: unknown[]
    }

    const heartbeats: HeartbeatRecord[] = []
    if (beatsResponse.ok && Array.isArray(beatsResponse.data)) {
      for (const raw of beatsResponse.data) {
        const norm = normalizeHeartbeat(raw)
        if (norm) heartbeats.push(norm)
      }
    }

    const total = heartbeats.length
    const upBeats = heartbeats.filter((b) => b.status === 1)
    const downBeats = heartbeats.filter((b) => b.status === 0)
    const pings = upBeats.map((b) => b.ping).filter((p): p is number => p !== null)

    const latestRawStatus = total > 0 ? (heartbeats[0]?.status ?? null) : null
    const latestBeat = total > 0 ? heartbeats[0] : null

    const status = computeStatusLabel(active, latestRawStatus)

    results.push({
      id,
      name,
      active,
      status,
      uptime24h: total > 0 ? (upBeats.length / total) * 100 : null,
      avgPing24h: pings.length > 0 ? pings.reduce((sum, p) => sum + p, 0) / pings.length : null,
      totalHeartbeats24h: total,
      recentOutages24h: downBeats.length,
      latestHeartbeat: latestBeat
        ? {
            status: STATUS_MAP[latestBeat.status] ?? 'unknown',
            time: latestBeat.time,
            msg: latestBeat.msg,
            ping: latestBeat.ping,
          }
        : null,
    })
  }

  return results
}

export async function getMonitorsByStatus(
  context: SocketContext,
  status: MonitorStatusLabel,
): Promise<MonitorStatusResult[]> {
  if (status === 'paused') {
    const allMonitors = await listMonitors(context)
    const paused = allMonitors.filter((m) => m.active === false || m.active === undefined)
    return paused.map((m) => ({
      id: m.id,
      name: m.name,
      active: false,
      status: 'paused' as MonitorStatusLabel,
      uptime24h: null,
      avgPing24h: null,
      totalHeartbeats24h: 0,
      recentOutages24h: 0,
      latestHeartbeat: null,
    }))
  }

  const allMonitors = await listMonitors(context)
  const activeMonitors = allMonitors.filter((m) => m.active !== false)

  const results: MonitorStatusResult[] = []
  for (const mon of activeMonitors) {
    try {
      const beatsResponse = (await context.socket.emitWithAck('getMonitorBeats', mon.id, 1)) as {
        ok: boolean
        data: unknown[]
      }
      let rawStatus: number | null = null
      if (beatsResponse.ok && beatsResponse.data.length > 0) {
        const norm = normalizeHeartbeat(beatsResponse.data[0])
        if (norm) rawStatus = norm.status
      }
      const label = computeStatusLabel(true, rawStatus)
      if (label === status) {
        results.push({
          id: mon.id,
          name: mon.name,
          active: true,
          status: label,
          uptime24h: null,
          avgPing24h: null,
          totalHeartbeats24h: 0,
          recentOutages24h: 0,
          latestHeartbeat:
            rawStatus !== null
              ? {
                  status: STATUS_MAP[rawStatus] ?? 'unknown',
                  time: '',
                  msg: null,
                  ping: null,
                }
              : null,
        })
      }
    } catch {}
  }

  return results
}

export async function getMonitorHeartbeatsById(
  context: SocketContext,
  id: number,
  hours: number = 24,
): Promise<{ id: number; name: string; heartbeats: HeartbeatRecord[] }> {
  let name: string
  try {
    const mon = await getMonitorById(context, id)
    name = mon.name
  } catch {
    name = ''
  }

  const beatsResponse = (await context.socket.emitWithAck('getMonitorBeats', id, hours)) as {
    ok: boolean
    data: unknown[]
  }

  const heartbeats: HeartbeatRecord[] = []
  if (beatsResponse.ok && Array.isArray(beatsResponse.data)) {
    for (const raw of beatsResponse.data) {
      const norm = normalizeHeartbeat(raw)
      if (norm) heartbeats.push(norm)
    }
  }

  return { id, name, heartbeats }
}

export async function getMonitorSummaryById(
  context: SocketContext,
  id: number,
): Promise<MonitorSummaryResult> {
  let name = ''
  let active = true
  try {
    const mon = await getMonitorById(context, id)
    name = mon.name
    active = mon.active ?? true
  } catch {
    // monitor not found
  }

  const beatsResponse = (await context.socket.emitWithAck('getMonitorBeats', id, 24)) as {
    ok: boolean
    data: unknown[]
  }

  const heartbeats: HeartbeatRecord[] = []
  if (beatsResponse.ok && Array.isArray(beatsResponse.data)) {
    for (const raw of beatsResponse.data) {
      const norm = normalizeHeartbeat(raw)
      if (norm) heartbeats.push(norm)
    }
  }

  const total = heartbeats.length
  const upBeats = heartbeats.filter((b) => b.status === 1)
  const downBeats = heartbeats.filter((b) => b.status === 0)
  const pings = upBeats.map((b) => b.ping).filter((p): p is number => p !== null)

  const latestRawStatus = heartbeats.length > 0 ? (heartbeats[0]?.status ?? null) : null
  const latestBeat = heartbeats.length > 0 ? heartbeats[0] : null

  return {
    id,
    name,
    active,
    status: computeStatusLabel(active, latestRawStatus),
    uptime24h: total > 0 ? (upBeats.length / total) * 100 : null,
    avgPing24h: pings.length > 0 ? pings.reduce((sum, p) => sum + p, 0) / pings.length : null,
    totalHeartbeats24h: total,
    recentOutages24h: downBeats.length,
    latestHeartbeat: latestBeat
      ? {
          status: STATUS_MAP[latestBeat.status] ?? 'unknown',
          time: latestBeat.time,
          msg: latestBeat.msg,
          ping: latestBeat.ping,
        }
      : null,
  }
}
