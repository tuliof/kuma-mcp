import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  server: {
    UPTIME_KUMA_URL: z.string().url().optional(),
    UPTIME_KUMA_USERNAME: z.string().optional(),
    UPTIME_KUMA_PASSWORD: z.string().optional(),
  },
})
