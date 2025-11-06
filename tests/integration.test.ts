import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { UptimeKumaClient } from '../src/client'
import { env } from '../src/env'
import type { AddMonitorInput } from '../src/schemas'
import { cleanupAllMonitors, waitForUptimeKuma } from './helpers'

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
})
