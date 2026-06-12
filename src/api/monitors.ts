import type { AddMonitorInput, MonitorSummary, UpdateMonitorInput } from './schemas.js'
import type { Monitor, SocketContext } from './types.js'
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
