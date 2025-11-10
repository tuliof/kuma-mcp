import { io } from 'socket.io-client'
import type { BaseResponse } from '../src/schemas'

interface SetupResponse {
  ok: boolean
  msg?: string
}

interface LoginResponse {
  ok: boolean
  token?: string
  msg?: string
}

/**
 * Helper to set up a fresh Uptime Kuma instance
 */
async function setupUptimeKuma(url: string, username: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      reconnection: false,
    })

    socket.on('connect', async () => {
      try {
        // Check if setup is needed
        const needsSetup = await new Promise<boolean>((res, _rej) => {
          socket.emit('needSetup', (response: boolean) => {
            res(response)
          })
        })

        if (needsSetup) {
          console.log('Setting up Uptime Kuma with admin credentials...')

          // Perform setup
          await new Promise<void>((res, rej) => {
            socket.emit('setup', username, password, (response: SetupResponse) => {
              if (response.ok) {
                console.log('Setup completed successfully')
                res()
              } else {
                rej(new Error(`Setup failed: ${response.msg || 'Unknown error'}`))
              }
            })
          })
        } else {
          console.log('Uptime Kuma is already set up')
        }

        socket.disconnect()
        resolve()
      } catch (error) {
        socket.disconnect()
        reject(error)
      }
    })

    socket.on('connect_error', (error) => {
      reject(new Error(`Connection failed: ${error.message}`))
    })
  })
}

/**
 * Wait for Uptime Kuma to be ready by polling the health endpoint
 */
async function waitForUptimeKuma(url: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status === 404) {
        // 404 is ok - means the server is up but setup might be needed
        console.log('Uptime Kuma HTTP endpoint is ready!')

        // Wait a bit more to ensure socket.io is ready
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Try to connect via socket to ensure it's fully ready
        const socketReady = await testSocketConnection(url)
        if (socketReady) {
          console.log('Uptime Kuma Socket.IO is ready!')
          return
        }
      }
    } catch (_error) {
      // Server not ready yet, continue waiting
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  throw new Error(`Uptime Kuma did not become ready within ${timeoutMs}ms`)
}

/**
 * Test if Socket.IO connection is working
 */
async function testSocketConnection(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = io(url, {
      reconnection: false,
      timeout: 5000,
    })

    const timeout = setTimeout(() => {
      socket.disconnect()
      resolve(false)
    }, 5000)

    socket.on('connect', () => {
      clearTimeout(timeout)
      socket.disconnect()
      resolve(true)
    })

    socket.on('connect_error', () => {
      clearTimeout(timeout)
      socket.disconnect()
      resolve(false)
    })
  })
}

/**
 * Clean up all monitors (useful for starting with a clean slate)
 */
async function cleanupAllMonitors(url: string, username: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      reconnection: false,
    })

    socket.on('connect', async () => {
      try {
        // Login
        await new Promise<void>((res, rej) => {
          socket.emit('login', { username, password }, (response: LoginResponse) => {
            if (response.ok) {
              res()
            } else {
              rej(new Error(`Login failed: ${response.msg || 'Unknown error'}`))
            }
          })
        })

        // Get all monitors
        const monitors = await new Promise<any[]>((res, rej) => {
          const handleMonitorList = (data: Record<string, any>) => {
            socket.off('monitorList', handleMonitorList)
            console.log(`Get all monitors: ${data}`)
            res(Object.values(data))
          }

          socket.on('monitorList', handleMonitorList)

          socket.emit('getMonitorList', (response: BaseResponse) => {
            if (!response.ok) {
              socket.off('monitorList', handleMonitorList)
              rej(new Error(`Failed to get monitors: ${response.msg || 'Unknown error'}`))
            }
          })

          setTimeout(() => {
            socket.off('monitorList', handleMonitorList)
            rej(new Error('Timeout waiting for monitor list'))
          }, 5000)
        })

        // Delete all monitors
        for (const monitor of monitors) {
          await new Promise<void>((res, _rej) => {
            socket.emit('deleteMonitor', monitor.id, (response: BaseResponse) => {
              if (response.ok) {
                res()
              } else {
                console.warn(`Failed to delete monitor ${monitor.id}:`, response.msg)
                res() // Continue even if one fails
              }
            })
          })
        }

        console.log(`Cleaned up ${monitors.length} monitor(s)`)
        socket.disconnect()
        resolve()
      } catch (error) {
        socket.disconnect()
        reject(error)
      }
    })

    socket.on('connect_error', (error) => {
      reject(new Error(`Connection failed: ${error.message}`))
    })
  })
}

export { setupUptimeKuma, waitForUptimeKuma, cleanupAllMonitors }
