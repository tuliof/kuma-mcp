import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { type AddMonitorInput, env, UptimeKumaClient } from '../src/api/index.js'
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
    for (const id of testMonitorIds) {
      try {
        await client.removeMonitorById(id)
      } catch (error) {
        console.error(`Failed to clean up monitor ${id}:`, error)
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

    const result = await client.addMonitor(monitor as AddMonitorInput)

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

    const result = await client.addMonitor(monitor as AddMonitorInput)

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

    const result = await client.addMonitor(monitor as AddMonitorInput)

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
    const monitor = await client.getMonitorById(monitorId)

    expect(monitor).toBeDefined()
    expect(monitor.id).toBe(monitorId)
    expect(monitor.name).toBe('Test HTTP Monitor')
    expect(monitor.type).toBe('http')
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
    await client.pauseMonitorById(monitorId)

    const monitor = await client.getMonitorById(monitorId)
    expect(monitor.active).toBe(false)
  })

  test('should resume a monitor', async () => {
    const monitorId = testMonitorIds[0]
    await client.resumeMonitorById(monitorId)

    const monitor = await client.getMonitorById(monitorId)
    expect(monitor.active).toBe(true)
  })

  test('should delete a monitor', async () => {
    const monitorId = testMonitorIds[testMonitorIds.length - 1]
    await client.removeMonitorById(monitorId)

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
    expect(client.getMonitorById(nonExistentId)).rejects.toThrow()
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
      for (const id of bulkMonitorIds) {
        try {
          await client.resumeMonitorById(id)
        } catch {
          /* ignore */
        }
      }
    })

    test('should pause monitors by name (plain text match)', async () => {
      const result = await client.pauseMonitorsByName('bulk-test')

      expect(result.paused).toBe(3)
      expect(result.monitors).toHaveLength(3)
      expect(result.monitors.map((m) => m.name).sort()).toEqual([
        'bulk-test-alpha',
        'bulk-test-beta',
        'bulk-test-gamma',
      ])

      for (const m of result.monitors) {
        const monitor = await client.getMonitorById(m.id)
        expect(monitor.active).toBe(false)
      }
    })

    test('should resume monitors by name (plain text match)', async () => {
      const result = await client.resumeMonitorsByName('bulk-test')

      expect(result.resumed).toBe(3)
      expect(result.monitors).toHaveLength(3)
      expect(result.monitors.map((m) => m.name).sort()).toEqual([
        'bulk-test-alpha',
        'bulk-test-beta',
        'bulk-test-gamma',
      ])

      for (const m of result.monitors) {
        const monitor = await client.getMonitorById(m.id)
        expect(monitor.active).toBe(true)
      }
    })

    test('should pause monitors by name (regex match)', async () => {
      const result = await client.pauseMonitorsByName('alpha|gamma', true)

      expect(result.paused).toBe(2)
      const names = result.monitors.map((m) => m.name).sort()
      expect(names).toEqual(['bulk-test-alpha', 'bulk-test-gamma'])

      for (const m of result.monitors) {
        const monitor = await client.getMonitorById(m.id)
        expect(monitor.active).toBe(false)
      }
    })

    test('should return 0 paused when no monitors match', async () => {
      const result = await client.pauseMonitorsByName('nonexistent-pattern')

      expect(result.paused).toBe(0)
      expect(result.monitors).toEqual([])
    })

    test('should return 0 resumed when no monitors match', async () => {
      const result = await client.resumeMonitorsByName('nonexistent-pattern')

      expect(result.resumed).toBe(0)
      expect(result.monitors).toEqual([])
    })

    test('should update multiple monitors by IDs', async () => {
      const ids = [bulkMonitorIds[0], bulkMonitorIds[2]]
      const result = await client.bulkUpdateMonitors(ids, { description: 'bulk-updated' })

      expect(result.updated).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(result.results.every((r) => r.success)).toBe(true)

      for (const m of result.results) {
        const monitor = await client.getMonitorById(m.id)
        expect(monitor.description).toBe('bulk-updated')
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

      // Verify the successful update took effect
      const monitor = await client.getMonitorById(bulkMonitorIds[1])
      expect(monitor.description).toBe('partial-test')
    })
  })
})
