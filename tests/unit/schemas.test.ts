import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import {
  AuthConfigSchema,
  BulkUpdateMonitorsInputSchema,
  FindMonitorsByNameInputSchema,
  GetMonitorHeartbeatsInputSchema,
  GetMonitorStatusInputSchema,
  MonitorConfigSchema,
  MonitorSummarySchema,
  MonitorTypeSchema,
  UpdateMonitorInputSchema,
  zodSchemaToToolInputSchema,
} from '../../src/api/schemas.js'

// ────────────────────────────────────────────────────────────
// Group A — MonitorConfigSchema.superRefine (contract req)
// ────────────────────────────────────────────────────────────
describe('MonitorConfigSchema - superRefine validation', () => {
  // Types with required fields — test that omitting each required field
  // produces a zod custom issue with the correct message and path.
  describe('required-field validation for each monitor type', () => {
    const errorCases: Array<{
      type: string
      missingField: string
      config: Record<string, unknown>
    }> = [
      { type: 'http', missingField: 'url', config: { name: 'test' } },
      { type: 'port', missingField: 'hostname', config: { name: 'test' } },
      { type: 'port', missingField: 'port', config: { name: 'test', hostname: 'localhost' } },
      { type: 'ping', missingField: 'hostname', config: { name: 'test' } },
      { type: 'keyword', missingField: 'url', config: { name: 'test', keyword: 'hello' } },
      {
        type: 'keyword',
        missingField: 'keyword',
        config: { name: 'test', url: 'https://example.com' },
      },
      {
        type: 'json-query',
        missingField: 'url',
        config: { name: 'test', jsonPath: '$.x', jsonPathOperator: '==', expectedValue: '1' },
      },
      {
        type: 'json-query',
        missingField: 'jsonPath',
        config: {
          name: 'test',
          url: 'https://example.com',
          jsonPathOperator: '==',
          expectedValue: '1',
        },
      },
      {
        type: 'json-query',
        missingField: 'jsonPathOperator',
        config: { name: 'test', url: 'https://example.com', jsonPath: '$.x', expectedValue: '1' },
      },
      {
        type: 'json-query',
        missingField: 'expectedValue',
        config: {
          name: 'test',
          url: 'https://example.com',
          jsonPath: '$.x',
          jsonPathOperator: '==',
        },
      },
      { type: 'dns', missingField: 'hostname', config: { name: 'test' } },
      { type: 'sqlserver', missingField: 'hostname', config: { name: 'test' } },
      {
        type: 'sqlserver',
        missingField: 'port',
        config: { name: 'test', hostname: 'db.example.com' },
      },
      { type: 'gamedig', missingField: 'hostname', config: { name: 'test' } },
      {
        type: 'gamedig',
        missingField: 'port',
        config: { name: 'test', hostname: 'game.example.com' },
      },
    ]

    test.each(errorCases)(
      '$type rejects missing $missingField',
      ({ type, missingField, config }) => {
        const result = MonitorConfigSchema.safeParse({ ...config, type })

        expect(result.success).toBe(false)

        const customIssue = result.error?.issues.find(
          (issue) => issue.code === 'custom' && issue.path[0] === missingField,
        )
        expect(customIssue).toBeDefined()
        expect(customIssue?.message).toBe(`${missingField} is required for ${type} monitor type`)
      },
    )

    // Also test that valid configs for these types pass
    const validCases: Array<{ type: string; config: Record<string, unknown> }> = [
      { type: 'http', config: { name: 'test', url: 'https://example.com' } },
      { type: 'port', config: { name: 'test', hostname: 'localhost', port: 8080 } },
      { type: 'ping', config: { name: 'test', hostname: '8.8.8.8' } },
      {
        type: 'keyword',
        config: { name: 'test', url: 'https://example.com', keyword: 'hello' },
      },
      {
        type: 'json-query',
        config: {
          name: 'test',
          url: 'https://example.com',
          jsonPath: '$.x',
          jsonPathOperator: '==',
          expectedValue: '1',
        },
      },
      { type: 'dns', config: { name: 'test', hostname: 'google.com' } },
      {
        type: 'sqlserver',
        config: { name: 'test', hostname: 'db.example.com', port: 1433 },
      },
      {
        type: 'gamedig',
        config: { name: 'test', hostname: 'server.example.com', port: 27015 },
      },
    ]

    test.each(validCases)('$type accepts valid config', ({ type, config }) => {
      const result = MonitorConfigSchema.safeParse({ ...config, type })
      expect(result.success).toBe(true)
    })
  })

  describe('monitor types with no required fields are always valid', () => {
    test.each(['push', 'group'])('%s passes without additional fields', (type) => {
      const result = MonitorConfigSchema.safeParse({ type, name: 'test' })
      expect(result.success).toBe(true)
    })
  })

  describe('default values are applied', () => {
    test('sets defaults for fields with defaults', () => {
      const result = MonitorConfigSchema.safeParse({
        type: 'http',
        name: 'defaults-test',
        url: 'https://example.com',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.interval).toBe(60)
        expect(result.data.retryInterval).toBe(60)
        expect(result.data.maxretries).toBe(0)
        expect(result.data.active).toBe(true)
        expect(result.data.requestTimeout).toBe(48)
        expect(result.data.maxredirects).toBe(10)
        expect(result.data.accepted_statuscodes).toEqual(['200-299'])
        expect(result.data.packetSize).toBe(56)
        expect(result.data.maxPackets).toBe(1)
        expect(result.data.perPingTimeout).toBe(2)
        expect(result.data.upsideDown).toBe(false)
        expect(result.data.resendInterval).toBe(0)
      }
    })
  })
})

// ────────────────────────────────────────────────────────────
// Group B — zodSchemaToToolInputSchema (contract req)
// ────────────────────────────────────────────────────────────
describe('zodSchemaToToolInputSchema', () => {
  test('returns an object with type, properties, and required keys', () => {
    const result = zodSchemaToToolInputSchema(MonitorConfigSchema)

    expect(result).not.toBeNull()
    expect(typeof result).toBe('object')
    expect(result).toHaveProperty('type')
    expect(result).toHaveProperty('properties')
    expect(result).toHaveProperty('required')
  })

  test('different input schemas produce different outputs', () => {
    const output1 = zodSchemaToToolInputSchema(MonitorTypeSchema)
    const output2 = zodSchemaToToolInputSchema(AuthConfigSchema)

    expect(JSON.stringify(output1)).not.toBe(JSON.stringify(output2))
  })

  test('delegates to z.toJSONSchema correctly', () => {
    const schema = z.object({
      id: z.number(),
      name: z.string(),
    })

    const viaHelper = zodSchemaToToolInputSchema(schema)
    const viaDirect = z.toJSONSchema(schema)

    expect(viaHelper).toEqual(viaDirect)
  })
})

// ────────────────────────────────────────────────────────────
// Group C — Additional schema coverage
// ────────────────────────────────────────────────────────────
describe('AuthConfigSchema', () => {
  test('rejects invalid URL', () => {
    const result = AuthConfigSchema.safeParse({ url: 'not-a-url' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toContain('url')
  })

  test('accepts URL with no optional credentials', () => {
    const result = AuthConfigSchema.safeParse({
      url: 'https://kuma.example.com',
    })
    expect(result.success).toBe(true)
  })

  test('accepts username+password', () => {
    const result = AuthConfigSchema.safeParse({
      url: 'https://kuma.example.com',
      username: 'admin',
      password: 'secret',
    })
    expect(result.success).toBe(true)
  })

  test('accepts apiKey', () => {
    const result = AuthConfigSchema.safeParse({
      url: 'https://kuma.example.com',
      apiKey: 'abc-123',
    })
    expect(result.success).toBe(true)
  })
})

describe('MonitorTypeSchema enum validation', () => {
  test('accepts valid monitor types', () => {
    const validTypes = [
      'http',
      'port',
      'ping',
      'keyword',
      'grpc-keyword',
      'json-query',
      'dns',
      'docker',
      'push',
      'steam',
      'mqtt',
      'kafka-producer',
      'sqlserver',
      'postgres',
      'mysql',
      'mongodb',
      'radius',
      'redis',
      'group',
      'gamedig',
      'tailscale-ping',
    ]
    for (const t of validTypes) {
      expect(MonitorTypeSchema.safeParse(t).success).toBe(true)
    }
  })

  test('rejects invalid type', () => {
    const result = MonitorTypeSchema.safeParse('invalid-type')
    expect(result.success).toBe(false)
  })
})

describe('FindMonitorsByNameInputSchema', () => {
  test('requires searchTerm', () => {
    const result = FindMonitorsByNameInputSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('useRegex defaults to false', () => {
    const result = FindMonitorsByNameInputSchema.safeParse({
      searchTerm: 'test',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.useRegex).toBe(false)
    }
  })

  test('accepts useRegex = true', () => {
    const result = FindMonitorsByNameInputSchema.safeParse({
      searchTerm: '^prod-',
      useRegex: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.useRegex).toBe(true)
    }
  })
})

describe('GetMonitorStatusInputSchema - refine', () => {
  test('rejects when neither id nor searchTerm provided', () => {
    const result = GetMonitorStatusInputSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Either "id" or "searchTerm" must be provided')
  })

  test('accepts id only', () => {
    const result = GetMonitorStatusInputSchema.safeParse({ id: 42 })
    expect(result.success).toBe(true)
  })

  test('accepts searchTerm only', () => {
    const result = GetMonitorStatusInputSchema.safeParse({
      searchTerm: 'test',
    })
    expect(result.success).toBe(true)
  })

  test('accepts both id and searchTerm', () => {
    const result = GetMonitorStatusInputSchema.safeParse({
      id: 1,
      searchTerm: 'test',
    })
    expect(result.success).toBe(true)
  })
})

describe('GetMonitorHeartbeatsInputSchema', () => {
  test('requires id', () => {
    const result = GetMonitorHeartbeatsInputSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('hours defaults to 24', () => {
    const result = GetMonitorHeartbeatsInputSchema.safeParse({ id: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.hours).toBe(24)
    }
  })

  test('accepts hours in range 1-720', () => {
    expect(GetMonitorHeartbeatsInputSchema.safeParse({ id: 1, hours: 1 }).success).toBe(true)
    expect(GetMonitorHeartbeatsInputSchema.safeParse({ id: 1, hours: 720 }).success).toBe(true)
    expect(GetMonitorHeartbeatsInputSchema.safeParse({ id: 1, hours: 48 }).success).toBe(true)
  })

  test('rejects hours outside range', () => {
    expect(GetMonitorHeartbeatsInputSchema.safeParse({ id: 1, hours: 0 }).success).toBe(false)
    expect(GetMonitorHeartbeatsInputSchema.safeParse({ id: 1, hours: 721 }).success).toBe(false)
    expect(GetMonitorHeartbeatsInputSchema.safeParse({ id: 1, hours: -1 }).success).toBe(false)
  })
})

describe('MonitorSummarySchema', () => {
  test('requires id, name, type, and active', () => {
    const result = MonitorSummarySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('accepts minimal valid input', () => {
    const result = MonitorSummarySchema.safeParse({
      id: 1,
      name: 'test',
      type: 'http',
      active: true,
    })
    expect(result.success).toBe(true)
  })

  test('accepts all optional fields', () => {
    const result = MonitorSummarySchema.safeParse({
      id: 1,
      name: 'test',
      type: 'http',
      active: true,
      url: 'https://example.com',
      description: 'A monitor',
      pathName: '/health',
      hostname: 'example.com',
      port: 443,
    })
    expect(result.success).toBe(true)
  })
})

describe('BulkUpdateMonitorsInputSchema', () => {
  test('rejects empty ids array', () => {
    const result = BulkUpdateMonitorsInputSchema.safeParse({
      ids: [],
      updates: { name: 'test' },
    })
    expect(result.success).toBe(false)
  })

  test('accepts ids with min length 1', () => {
    const result = BulkUpdateMonitorsInputSchema.safeParse({
      ids: [1],
      updates: { name: 'test' },
    })
    expect(result.success).toBe(true)
  })

  test('accepts multiple ids with partial config', () => {
    const result = BulkUpdateMonitorsInputSchema.safeParse({
      ids: [1, 2, 3],
      updates: { active: false, description: 'bulk update' },
    })
    expect(result.success).toBe(true)
  })
})

describe('UpdateMonitorInputSchema', () => {
  test('requires id', () => {
    const result = UpdateMonitorInputSchema.safeParse({ name: 'test' })
    expect(result.success).toBe(false)
  })

  test('accepts id + partial config', () => {
    const result = UpdateMonitorInputSchema.safeParse({
      id: 1,
      name: 'updated',
      url: 'https://example.com',
    })
    expect(result.success).toBe(true)
  })

  test('allows empty updates when id is present', () => {
    // Partial() of MonitorConfigSchema means all fields are optional,
    // so an empty object for the config part should be valid
    const result = UpdateMonitorInputSchema.safeParse({ id: 1 })
    expect(result.success).toBe(true)
  })
})
