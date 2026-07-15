import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  server: {
    UPTIME_KUMA_PORT: z.string().default('3001'),
    UPTIME_KUMA_URL: z
      .url()
      // biome-ignore lint/complexity/useLiteralKeys: process.env has index signature
      .default(`http://localhost:${process.env['UPTIME_KUMA_PORT'] || '3001'}`),
    UPTIME_KUMA_USERNAME: z.string().default('admin'),
    UPTIME_KUMA_PASSWORD: z.string().default('admin123'),
  },
  onValidationError: (error) => {
    const { UPTIME_KUMA_USERNAME, UPTIME_KUMA_PASSWORD } = process.env
    const hasCredentials = UPTIME_KUMA_USERNAME && UPTIME_KUMA_PASSWORD

    if (!hasCredentials) {
      throw new Error('UPTIME_KUMA_USERNAME and UPTIME_KUMA_PASSWORD must be set')
    }

    throw error
  },
})
