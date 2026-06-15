/**
 * Generates or updates CHANGELOG.md with an [Unreleased] section
 * from all conventional commits since the last git tag.
 *
 * Usage: bun run changelog
 */

import { $ } from 'bun'

const TAG_PATTERN = 'v[0-9].*'
const OUTPUT_FILE = 'CHANGELOG.md'

async function verifyGitCliff(): Promise<void> {
  try {
    await $`bunx git-cliff --version`.quiet()
  } catch {
    console.error('❌ git-cliff is not available. Run: bun add -D git-cliff')
    process.exit(1)
  }
}

async function generateChangelog(): Promise<void> {
  await verifyGitCliff()

  console.log('📝 Generating changelog from commits since last tag...')

  const result =
    await $`bunx git-cliff --unreleased --tag-pattern ${TAG_PATTERN} --output ${OUTPUT_FILE}`.quiet()

  if (result.exitCode !== 0) {
    console.error('❌ git-cliff failed to generate changelog')
    process.exit(1)
  }

  console.log(`✅ ${OUTPUT_FILE} updated with [Unreleased] section`)
}

await generateChangelog()
