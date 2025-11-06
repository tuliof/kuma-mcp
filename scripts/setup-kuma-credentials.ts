import { setupUptimeKuma } from '../tests/helpers'

const url = process.env.UPTIME_KUMA_URL
const username = process.env.UPTIME_KUMA_USERNAME
const password = process.env.UPTIME_KUMA_PASSWORD

// Check if username and password are provided
if (!url || !username || !password) {
  console.error(
    '❌ UPTIME_KUMA_URL, UPTIME_KUMA_USERNAME and UPTIME_KUMA_PASSWORD environment variables must be set',
  )
  process.exit(1)
}

/**
 * Shows a spinner while a promise is pending,
 * then shows a checkmark or X when resolved/rejected
 *
 * @param message The message to display
 * @param promise The promise to await
 */
async function withSpinner<T>(message: string, promise: Promise<T>): Promise<T> {
  let loadingIndex = 0

  const loadingStates: string[] = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']

  // Start loading indicator
  const loadingInterval = setInterval(() => {
    process.stdout.write(`\r${loadingStates[loadingIndex]} ${message}`)
    loadingIndex = (loadingIndex + 1) % loadingStates.length
  }, 100)

  try {
    const result = await promise
    clearInterval(loadingInterval)
    process.stdout.cursorTo(0)
    process.stdout.write(`\r✓ ${message}\n`)
    return result
  } catch (error) {
    clearInterval(loadingInterval)
    process.stdout.cursorTo(0)
    process.stdout.write(`\rx ${message}\n`)
    throw error
  }
}

const timeout = 10000 // 10 seconds

// Wait for kuma to become available, with timeout
const p = (async () => {
  const timeoutAt = Date.now() + timeout
  while (Date.now() < timeoutAt) {
    try {
      const res = await fetch(`${url}/setup`)
      if (res.ok) {
        return ''
      }
    } catch (_error) {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw `Timed out waiting for Uptime-Kuma after ${timeout / 1000} seconds`
})()

try {
  await withSpinner('Waiting for Uptime-Kuma to become available', p)
  await withSpinner('Setting up Uptime-Kuma credentials', setupUptimeKuma(url, username, password))
} catch (error) {
  console.error(`x ${error}`)
  process.exit(1)
}
console.log('✓ All done!')
process.exit(0)
