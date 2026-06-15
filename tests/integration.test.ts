import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { AddMonitorInputSchema, env, UptimeKumaClient } from '../src/api/index.js'
import { cleanupAllMonitors, waitForUptimeKuma } from './helpers.js'

describe('Uptime Kuma Integration Tests', () => {
  let client: UptimeKumaClient
  const testMonitorIds: number[] = []

  beforeAll(async () => {
    console.log('Connecting to Uptime Kuma at', env.UPTIME_KUMA_URL)

    // Wait for Uptime Kuma to be ready (in case it just started)
    await waitForUptimeKuma(env.UPTIME_KUMA_URL, 3000)
    await cleanupAllMonitors(
      env.UPTIME_KUMA_URL,
      env.UPTIME_KUMA_USERNAME,
      env.UPTIME_KUMA_PASSWORD,
    )

    // Initialize client
    client = new UptimeKumaClient({
      url: env.UPTIME_KUMA_URL,
      username: env.UPTIME_KUMA_USERNAME,
      password: env.UPTIME_KUMA_PASSWORD,
      apiKey: env.UPTIME_KUMA_API_KEY,
    })
    await client.connect()
    await client.authenticate()

    console.log('✓ Connected and authenticated successfully')
  })

  afterAll(async () => {
    // Only cleanup if client was initialized
    if (!client) {
      console.log('⚠️  Client was never initialized, skipping cleanup')
      return
    }

    // Clean up test monitors
    if (testMonitorIds.length > 0) {
      try {
        await client.removeMonitors(testMonitorIds)
      } catch (error) {
        console.error(`Failed to clean up monitors:`, error)
      }
    }

    // Disconnect client
    try {
      await client.disconnect()
      console.log('✓ Cleaned up and disconnected')
    } catch (error) {
      console.error('Failed to disconnect client:', error)
    }
  })

  test('should connect and authenticate successfully', async () => {
    expect(client).toBeDefined()
  })

  test('should add an HTTP monitor', async () => {
    const monitor = {
      type: 'http' as const,
      name: 'Test HTTP Monitor',
      url: 'https://httpbin.org/status/200',
      interval: 60,
      retryInterval: 60,
      maxretries: 3,
      active: true,
    }

    const result = await client.addMonitor(AddMonitorInputSchema.parse(monitor))

    expect(result).toBeDefined()
    expect(result.id).toBeGreaterThan(0)
    expect(result.name).toBe(monitor.name)
    expect(result.type).toBe(monitor.type)
    expect(result.url).toBe(monitor.url)

    testMonitorIds.push(result.id)
  })

  test('should add a keyword-based monitor', async () => {
    const monitor = {
      type: 'keyword' as const,
      name: 'Test Keyword Monitor',
      url: 'https://httpbin.org/html',
      keyword: 'Herman Melville',
      interval: 60,
      retryInterval: 60,
      maxretries: 3,
      active: true,
    }

    const result = await client.addMonitor(AddMonitorInputSchema.parse(monitor))

    expect(result).toBeDefined()
    expect(result.id).toBeGreaterThan(0)
    expect(result.name).toBe(monitor.name)
    expect(result.keyword).toBe(monitor.keyword)

    testMonitorIds.push(result.id)
  })

  test('should add a JSON query monitor', async () => {
    const monitor = {
      type: 'json-query' as const,
      name: 'Test JSON Monitor',
      url: 'https://httpbin.org/json',
      jsonPath: '$.slideshow.author',
      jsonPathOperator: '==' as const,
      expectedValue: 'Yours Truly',
      interval: 60,
      retryInterval: 60,
      maxretries: 3,
      active: true,
    }

    const result = await client.addMonitor(AddMonitorInputSchema.parse(monitor))

    expect(result).toBeDefined()
    expect(result.id).toBeGreaterThan(0)
    expect(result.name).toBe(monitor.name)

    testMonitorIds.push(result.id)
  })

  test('should list all monitors', async () => {
    const monitors = await client.listMonitors()

    expect(monitors).toBeDefined()
    expect(Array.isArray(monitors)).toBe(true)
    expect(monitors.length).toBeGreaterThanOrEqual(testMonitorIds.length)

    // Verify our test monitors are in the list
    const testMonitorNames = ['Test HTTP Monitor', 'Test Keyword Monitor', 'Test JSON Monitor']
    const foundMonitors = monitors.filter((m) => testMonitorNames.includes(m.name))
    expect(foundMonitors.length).toBe(testMonitorNames.length)
  })

  test('should get a specific monitor', async () => {
    const monitorId = testMonitorIds[0]
    const monitors = await client.getMonitors([monitorId])

    expect(monitors).toHaveLength(1)
    expect(monitors[0].id).toBe(monitorId)
    expect(monitors[0].name).toBe('Test HTTP Monitor')
    expect(monitors[0].type).toBe('http')
  })

  test('should update a monitor', async () => {
    const monitorId = testMonitorIds[0]
    const updatedMonitor = await client.updateMonitorById({
      id: monitorId,
      name: 'Updated HTTP Monitor',
      description: 'This monitor has been updated',
    })

    expect(updatedMonitor).toBeDefined()
    expect(updatedMonitor.id).toBe(monitorId)
    expect(updatedMonitor.name).toBe('Updated HTTP Monitor')
    expect(updatedMonitor.description).toBe('This monitor has been updated')
  })

  test('should pause a monitor', async () => {
    const monitorId = testMonitorIds[0]
    await client.pauseMonitors([monitorId])

    const monitors = await client.getMonitors([monitorId])
    expect(monitors[0].active).toBe(false)
  })

  test('should resume a monitor', async () => {
    const monitorId = testMonitorIds[0]
    await client.resumeMonitors([monitorId])

    const monitors = await client.getMonitors([monitorId])
    expect(monitors[0].active).toBe(true)
  })

  test('should delete a monitor', async () => {
    const monitorId = testMonitorIds[testMonitorIds.length - 1]
    const result = await client.removeMonitors([monitorId])

    expect(result.removed).toBe(1)
    expect(result.monitors[0].id).toBe(monitorId)

    // Remove from tracking array since it's already deleted
    testMonitorIds.pop()

    // Verify it's gone
    const monitors = await client.listMonitors()
    const deletedMonitor = monitors.find((m) => m.id === monitorId)
    expect(deletedMonitor).toBeUndefined()
  })

  test('should find monitors by name (partial match)', async () => {
    const monitors = await client.findMonitorsByName('HTTP')

    expect(monitors).toBeDefined()
    expect(Array.isArray(monitors)).toBe(true)
    expect(monitors.length).toBeGreaterThan(0)

    // Should find the "Updated HTTP Monitor"
    const httpMonitor = monitors.find((m) => m.name === 'Updated HTTP Monitor')
    expect(httpMonitor).toBeDefined()
    expect(httpMonitor?.id).toBeDefined()
    expect(httpMonitor?.type).toBe('http')
    expect(httpMonitor?.active).toBeDefined()
  })

  test('should find monitors by name using regex', async () => {
    // Find all monitors that start with "Test" or "Updated"
    const monitors = await client.findMonitorsByName('^(Test|Updated)', true)

    expect(monitors).toBeDefined()
    expect(Array.isArray(monitors)).toBe(true)
    expect(monitors.length).toBe(2)

    // All returned monitors should match the pattern
    for (const monitor of monitors) {
      expect(['Test', 'Updated'].some((prefix) => monitor.name.startsWith(prefix))).toBe(true)
    }
  })

  test('should return empty array when no monitors match', async () => {
    const monitors = await client.findMonitorsByName('NonExistentMonitorXYZ123')

    expect(monitors).toBeDefined()
    expect(Array.isArray(monitors)).toBe(true)
    expect(monitors.length).toBe(0)
  })

  test('should handle invalid regex pattern', () => {
    // Invalid regex pattern with unclosed bracket
    expect(client.findMonitorsByName('[invalid', true)).rejects.toThrow(
      'Invalid regular expression',
    )
  })

  test('should handle errors for non-existent monitor', () => {
    const nonExistentId = 999999
    expect(client.getMonitors([nonExistentId])).rejects.toThrow()
  })

  describe('Bulk Operations', () => {
    const bulkMonitorIds: number[] = []

    beforeAll(async () => {
      const monitors = [
        {
          type: 'port' as const,
          name: 'bulk-test-alpha',
          hostname: 'localhost',
          port: 1,
          interval: 60,
          retryInterval: 60,
          maxretries: 3,
          active: true,
        },
        {
          type: 'port' as const,
          name: 'bulk-test-beta',
          hostname: 'localhost',
          port: 2,
          interval: 60,
          retryInterval: 60,
          maxretries: 3,
          active: true,
        },
        {
          type: 'port' as const,
          name: 'bulk-test-gamma',
          hostname: 'localhost',
          port: 3,
          interval: 60,
          retryInterval: 60,
          maxretries: 3,
          active: true,
        },
        {
          type: 'port' as const,
          name: 'bulk-other',
          hostname: 'localhost',
          port: 4,
          interval: 60,
          retryInterval: 60,
          maxretries: 3,
          active: true,
        },
      ]

      for (const m of monitors) {
        const result = await client.addMonitor(m)
        bulkMonitorIds.push(result.id)
        testMonitorIds.push(result.id)
      }
    })

    afterAll(async () => {
      // Ensure all bulk monitors are resumed after tests
      try {
        await client.resumeMonitors(bulkMonitorIds)
      } catch {
        /* ignore */
      }
    })

    test('should pause multiple monitors by IDs', async () => {
      const ids = [bulkMonitorIds[0], bulkMonitorIds[1], bulkMonitorIds[2]]
      const result = await client.pauseMonitors(ids)

      expect(result.paused).toBe(3)
      expect(result.monitors).toHaveLength(3)
      expect(result.monitors.map((m) => m.id).sort()).toEqual([...ids].sort())

      for (const m of result.monitors) {
        const monitors = await client.getMonitors([m.id])
        expect(monitors[0].active).toBe(false)
      }
    })

    test('should resume multiple monitors by IDs', async () => {
      const ids = [bulkMonitorIds[0], bulkMonitorIds[1], bulkMonitorIds[2]]
      const result = await client.resumeMonitors(ids)

      expect(result.resumed).toBe(3)
      expect(result.monitors).toHaveLength(3)
      expect(result.monitors.map((m) => m.id).sort()).toEqual([...ids].sort())

      for (const m of result.monitors) {
        const monitors = await client.getMonitors([m.id])
        expect(monitors[0].active).toBe(true)
      }
    })

    test('should pause a single monitor by ID', async () => {
      const result = await client.pauseMonitors([bulkMonitorIds[0]])

      expect(result.paused).toBe(1)
      expect(result.monitors[0].id).toBe(bulkMonitorIds[0])
    })

    test('should resume a single monitor by ID', async () => {
      const result = await client.resumeMonitors([bulkMonitorIds[0]])

      expect(result.resumed).toBe(1)
      expect(result.monitors[0].id).toBe(bulkMonitorIds[0])
    })

    test('should update multiple monitors by IDs', async () => {
      const ids = [bulkMonitorIds[0], bulkMonitorIds[2]]
      const result = await client.bulkUpdateMonitors(ids, { description: 'bulk-updated' })

      expect(result.updated).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(result.results.every((r) => r.success)).toBe(true)

      for (const m of result.results) {
        const monitors = await client.getMonitors([m.id])
        expect(monitors[0].description).toBe('bulk-updated')
      }
    })

    test('should handle partial failures in bulk update', async () => {
      const ids = [bulkMonitorIds[1], 999999]
      const result = await client.bulkUpdateMonitors(ids, { description: 'partial-test' })

      expect(result.updated).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.results).toHaveLength(2)

      const successResult = result.results.find((r) => r.success)
      expect(successResult?.id).toBe(bulkMonitorIds[1])

      const failResult = result.results.find((r) => !r.success)
      expect(failResult?.id).toBe(999999)
      expect(failResult?.error).toBeDefined()

      // Verify the successful update took place
      const monitors = await client.getMonitors([bulkMonitorIds[1]])
      expect(monitors[0].description).toBe('partial-test')
    })
  })

  describe('Status & Health', () => {
    const statusMonitorIds: number[] = []

    beforeAll(async () => {
      const monitors = [
        {
          type: 'port' as const,
          name: 'status-active-monitor',
          hostname: 'localhost',
          port: 10,
          interval: 60,
          retryInterval: 60,
          maxretries: 3,
          active: true,
        },
        {
          type: 'port' as const,
          name: 'status-paused-monitor',
          hostname: 'localhost',
          port: 11,
          interval: 60,
          retryInterval: 60,
          maxretries: 3,
          active: false,
        },
      ]
      for (const m of monitors) {
        const result = await client.addMonitor(m)
        statusMonitorIds.push(result.id)
        testMonitorIds.push(result.id)
      }
    })

    test('should get monitor status by id', async () => {
      const result = await client.getMonitorStatus({ id: statusMonitorIds[0] })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(statusMonitorIds[0])
      expect(result[0].name).toBe('status-active-monitor')
      expect(['up', 'down', 'pending', 'unknown']).toContain(result[0].status)
      expect(typeof result[0].totalHeartbeats24h).toBe('number')
      expect(typeof result[0].recentOutages24h).toBe('number')
      if (result[0].totalHeartbeats24h > 0) {
        expect(typeof result[0].uptime24h).toBe('number')
      }
    })

    test('should get monitor status by name', async () => {
      const result = await client.getMonitorStatus({ searchTerm: 'status-active-monitor' })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(statusMonitorIds[0])
    })

    test('should get monitor status by regex', async () => {
      const result = await client.getMonitorStatus({
        searchTerm: 'status-(active|paused)',
        useRegex: true,
      })

      expect(result).toHaveLength(2)
      const ids = result.map((r) => r.id).sort()
      expect(ids).toEqual([statusMonitorIds[0], statusMonitorIds[1]].sort())
    })

    test('should return empty array for non-existent name search', async () => {
      const result = await client.getMonitorStatus({ searchTerm: 'nonexistent-monitor' })

      expect(result).toEqual([])
    })

    test('should return empty array for non-existent id search', async () => {
      const result = await client.getMonitorStatus({ id: 999999 })

      // getMonitorById throws for non-existent id, caught in the try/catch,
      // so the for loop continues and returns empty
      expect(result).toEqual([])
    })

    test('should find paused monitors by status', async () => {
      const result = await client.getMonitorsByStatus('paused')

      expect(result.length).toBeGreaterThanOrEqual(1)
      const pausedMonitor = result.find((m) => m.id === statusMonitorIds[1])
      expect(pausedMonitor).toBeDefined()
      expect(pausedMonitor?.status).toBe('paused')
      expect(pausedMonitor?.active).toBe(false)
    })

    test('should get raw heartbeats by id', async () => {
      const result = await client.getMonitorHeartbeatsById(statusMonitorIds[0], 24)

      expect(result.id).toBe(statusMonitorIds[0])
      expect(result.name).toBe('status-active-monitor')
      expect(Array.isArray(result.heartbeats)).toBe(true)
      if (result.heartbeats.length > 0) {
        const beat = result.heartbeats[0]
        expect(typeof beat.time).toBe('string')
        expect(typeof beat.status).toBe('number')
        expect(beat.ping === null || typeof beat.ping === 'number').toBe(true)
        expect(beat.msg === null || typeof beat.msg === 'string').toBe(true)
        expect(typeof beat.important).toBe('boolean')
        expect(typeof beat.duration).toBe('number')
      }
    })

    test('should get summary by id', async () => {
      const result = await client.getMonitorSummaryById(statusMonitorIds[0])

      expect(result.id).toBe(statusMonitorIds[0])
      expect(result.name).toBe('status-active-monitor')
      expect(['up', 'down', 'pending', 'unknown', 'paused', 'maintenance']).toContain(result.status)
      expect(typeof result.totalHeartbeats24h).toBe('number')
      expect(typeof result.recentOutages24h).toBe('number')
      if (result.totalHeartbeats24h > 0) {
        expect(typeof result.uptime24h).toBe('number')
        expect(result.uptime24h).toBeGreaterThanOrEqual(0)
        expect(result.uptime24h).toBeLessThanOrEqual(100)
      } else {
        expect(result.status).toBe('pending')
      }
      if (result.uptime24h !== null) {
        expect(typeof result.avgPing24h === 'number' || result.avgPing24h === null).toBe(true)
      }
    })

    test('should get summary for paused monitor', async () => {
      const result = await client.getMonitorSummaryById(statusMonitorIds[1])

      expect(result.status).toBe('paused')
      expect(result.active).toBe(false)
    })

    test('getMonitorSummaryById returns summary (not throws) for non-existent id', async () => {
      const result = await client.getMonitorSummaryById(999999)

      expect(result).toBeDefined()
      expect(result.id).toBe(999999)
      expect(result.name).toBe('')
      expect(result.active).toBe(true)
      expect(result.status).toBe('unknown')
      expect(result.totalHeartbeats24h).toBe(0)
      expect(result.recentOutages24h).toBe(0)
      expect(result.uptime24h).toBeNull()
      expect(result.avgPing24h).toBeNull()
      expect(result.latestHeartbeat).toBeNull()
    })

    test('getMonitorHeartbeatsById returns empty heartbeats for non-existent id', async () => {
      const result = await client.getMonitorHeartbeatsById(999999, 24)

      expect(result).toBeDefined()
      expect(result.id).toBe(999999)
      expect(result.name).toBe('')
      expect(result.heartbeats).toEqual([])
    })

    test('getMonitorsByStatus("unknown") returns active monitors with no heartbeats', async () => {
      const result = await client.getMonitorsByStatus('unknown')

      expect(Array.isArray(result)).toBe(true)
      // Every returned monitor should have unknown status
      for (const mon of result) {
        expect(mon.status).toBe('unknown')
        expect(mon.active).toBe(true)
      }
    })
  })
})
