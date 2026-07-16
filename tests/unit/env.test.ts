import { afterAll, describe, expect, test } from 'bun:test'

// Store the original env to restore after tests
const ORIGINAL_ENV = { ...process.env }

describe('env.ts validation', () => {
  afterAll(() => {
    // Restore all original environment variables
    process.env.UPTIME_KUMA_URL = ORIGINAL_ENV.UPTIME_KUMA_URL
    process.env.UPTIME_KUMA_USERNAME = ORIGINAL_ENV.UPTIME_KUMA_USERNAME
    process.env.UPTIME_KUMA_PASSWORD = ORIGINAL_ENV.UPTIME_KUMA_PASSWORD
    delete process.env.UPTIME_KUMA_PORT
  })

  test('invalid URL throws validation error', async () => {
    process.env.UPTIME_KUMA_URL = 'not-a-valid-url'
    process.env.UPTIME_KUMA_USERNAME = 'admin'
    process.env.UPTIME_KUMA_PASSWORD = 'admin123'

    let thrown: unknown
    try {
      await import('../../src/api/env.ts?invalid-url')
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeDefined()
    if (thrown instanceof Error) {
      expect(thrown.message).toContain('Invalid environment')
    }
  })

  test('missing URL is undefined (optional)', async () => {
    delete process.env.UPTIME_KUMA_URL
    process.env.UPTIME_KUMA_USERNAME = 'admin'
    process.env.UPTIME_KUMA_PASSWORD = 'admin123'

    const mod = await import('../../src/api/env.ts?missing-url')
    expect(mod.env.UPTIME_KUMA_URL).toBeUndefined()
  })

  test('valid config loads without throwing', async () => {
    process.env.UPTIME_KUMA_URL = 'http://localhost:3001'
    process.env.UPTIME_KUMA_USERNAME = 'admin'
    process.env.UPTIME_KUMA_PASSWORD = 'admin123'

    const mod = await import('../../src/api/env.ts?valid-config')
    expect(mod).toBeDefined()
    expect(mod.env).toBeDefined()
    expect(mod.env.UPTIME_KUMA_URL).toBe('http://localhost:3001')
  })
})
