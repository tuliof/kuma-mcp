import { afterAll, describe, expect, test } from 'bun:test'

// Store the original env to restore after tests
const ORIGINAL_ENV = { ...process.env }

describe('env.ts validation', () => {
  afterAll(() => {
    // Restore all original environment variables
    process.env.UPTIME_KUMA_URL = ORIGINAL_ENV.UPTIME_KUMA_URL
    process.env.UPTIME_KUMA_USERNAME = ORIGINAL_ENV.UPTIME_KUMA_USERNAME
    process.env.UPTIME_KUMA_PASSWORD = ORIGINAL_ENV.UPTIME_KUMA_PASSWORD
  })

  test('no credentials with invalid URL throws descriptive error', async () => {
    // Set invalid URL to trigger env validation failure
    process.env.UPTIME_KUMA_URL = 'not-a-valid-url'
    // Clear credential env vars
    delete process.env.UPTIME_KUMA_USERNAME
    delete process.env.UPTIME_KUMA_PASSWORD

    // Dynamic import with cache busting to force re-evaluation
    await expect(import('../../src/api/env.ts?no-creds')).rejects.toThrow(
      'UPTIME_KUMA_USERNAME and UPTIME_KUMA_PASSWORD must be set',
    )
  })

  test('credentials present with invalid URL throws original error, not custom one', async () => {
    // Set invalid URL to trigger env validation failure
    process.env.UPTIME_KUMA_URL = 'not-a-valid-url'
    // Set credentials so onValidationError does NOT throw custom error
    process.env.UPTIME_KUMA_USERNAME = 'admin'
    process.env.UPTIME_KUMA_PASSWORD = 'admin123'

    let thrown: unknown
    try {
      await import('../../src/api/env.ts?has-creds')
    } catch (err) {
      thrown = err
    }

    // Should have thrown
    expect(thrown).toBeDefined()
    // Should NOT be the custom credentials error (since credentials ARE set)
    if (thrown instanceof Error) {
      expect(thrown.message).not.toContain('UPTIME_KUMA_USERNAME')
    }
  })

  test('valid config loads without throwing', async () => {
    // Reset all env vars to valid values
    process.env.UPTIME_KUMA_URL = 'http://localhost:3001'
    process.env.UPTIME_KUMA_USERNAME = 'admin'
    process.env.UPTIME_KUMA_PASSWORD = 'admin123'

    // With valid URL and credentials, this should load without error
    const mod = await import('../../src/api/env.ts?valid-config')
    expect(mod).toBeDefined()
    expect(mod.env).toBeDefined()
    expect(mod.env.UPTIME_KUMA_URL).toBe('http://localhost:3001')
  })
})
