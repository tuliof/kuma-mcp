import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  server: {
    UPTIME_KUMA_PORT: z.string().default('3001'),
    UPTIME_KUMA_URL: z
      .url()
      .default(`http://localhost:${process.env['UPTIME_KUMA_PORT'] || '3001'}`),
    UPTIME_KUMA_USERNAME: z.string().default('admin'),
    UPTIME_KUMA_PASSWORD: z.string().default('admin123'),
    UPTIME_KUMA_API_KEY: z.string().optional(),
  },
  // Require either username+password OR api_key to be set
  onValidationError: (error) => {
    const { UPTIME_KUMA_USERNAME, UPTIME_KUMA_PASSWORD, UPTIME_KUMA_API_KEY } = process.env
    const hasCredentials = UPTIME_KUMA_USERNAME && UPTIME_KUMA_PASSWORD
    const hasApiKey = UPTIME_KUMA_API_KEY

    if (!hasCredentials && !hasApiKey) {
      throw new Error(
        'Either UPTIME_KUMA_USERNAME and UPTIME_KUMA_PASSWORD must be set, or UPTIME_KUMA_API_KEY must be set',
      )
    }

    throw error
  },
})
