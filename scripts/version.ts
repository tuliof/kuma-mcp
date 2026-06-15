/**
 * Bumps the package version, finalizes the changelog with a dated version entry,
 * and creates a git commit + tag for the release.
 *
 * Usage: bun run scripts/version.ts <patch|minor|major>
 */

import { $ } from 'bun'

const VALID_BUMP_TYPES = ['patch', 'minor', 'major'] as const
type BumpType = (typeof VALID_BUMP_TYPES)[number]
const OUTPUT_FILE = 'CHANGELOG.md'
const PACKAGE_FILE = 'package.json'

interface PackageJsonShape {
  version: string
}

// ── Guard: parse and validate the bump type argument ──

function parseBumpType(raw: string | undefined): BumpType {
  if (raw === undefined) {
    console.error('❌ Missing bump type. Usage: bun run scripts/version.ts <patch|minor|major>')
    process.exit(1)
  }

  if (!VALID_BUMP_TYPES.includes(raw as BumpType)) {
    console.error(`❌ Invalid bump type: "${raw}". Expected: patch, minor, or major`)
    process.exit(1)
  }

  return raw as BumpType
}

// ── Version utilities ──

async function readPackageVersion(): Promise<string> {
  const pkgFile = Bun.file(PACKAGE_FILE)
  const pkg = (await pkgFile.json()) as PackageJsonShape

  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    console.error('❌ package.json does not contain a valid "version" field')
    process.exit(1)
  }

  return pkg.version
}

function bumpSemver(current: string, bumpType: BumpType): string {
  const parts = current.split('.')

  if (parts.length !== 3) {
    console.error(`❌ Cannot bump version: "${current}" is not a valid semver string`)
    process.exit(1)
  }

  const numericParts = parts.map(Number)
  const hasInvalidPart = numericParts.some((p) => Number.isNaN(p))

  if (hasInvalidPart) {
    console.error(`❌ Cannot bump version: "${current}" contains non-numeric segments`)
    process.exit(1)
  }

  const bumpIndex: Record<BumpType, number> = { major: 0, minor: 1, patch: 2 }
  const index = bumpIndex[bumpType]

  // Zero out all parts below the bump index
  for (let i = index + 1; i < 3; i++) {
    numericParts[i] = 0
  }

  const currentValue = numericParts[index]

  if (currentValue === undefined) {
    console.error(`❌ Version part at index ${index} is undefined for "${current}"`)
    process.exit(1)
  }

  numericParts[index] = currentValue + 1

  return numericParts.join('.')
}

async function writePackageVersion(newVersion: string): Promise<void> {
  const pkgFile = Bun.file(PACKAGE_FILE)
  const pkg = (await pkgFile.json()) as Record<string, unknown>
  pkg.version = newVersion
  await Bun.write(PACKAGE_FILE, `${JSON.stringify(pkg, null, 2)}\n`)
}

// ── Git guards and operations ──

async function verifyCleanWorkingTree(): Promise<void> {
  const { exitCode, stdout } = await $`git status --porcelain`.quiet()

  if (exitCode !== 0) {
    console.error('❌ Failed to check git working tree status')
    process.exit(1)
  }

  if (stdout.toString().trim().length > 0) {
    console.error('❌ Working tree is not clean. Commit or stash changes before versioning.')
    process.exit(1)
  }
}

async function verifyGitCliff(): Promise<void> {
  try {
    await $`bunx git-cliff --version`.quiet()
  } catch {
    console.error('❌ git-cliff is not available. Run: bun add -D git-cliff')
    process.exit(1)
  }
}

async function finalizeChangelog(tag: string): Promise<void> {
  const result = await $`bunx git-cliff --tag ${tag} --output ${OUTPUT_FILE}`.quiet()

  if (result.exitCode !== 0) {
    console.error(`❌ git-cliff failed to finalize changelog for ${tag}`)
    process.exit(1)
  }
}

// ── Main ──

const bumpType = parseBumpType(Bun.argv[2])

await verifyCleanWorkingTree()
await verifyGitCliff()

const currentVersion = await readPackageVersion()
const newVersion = bumpSemver(currentVersion, bumpType)
const tag = `v${newVersion}`

console.log(`📦 Bumping version: ${currentVersion} → ${newVersion}`)
await writePackageVersion(newVersion)

console.log(`📝 Finalizing changelog for ${tag}...`)
await finalizeChangelog(tag)

console.log('📦 Committing release...')
await $`git add ${PACKAGE_FILE} ${OUTPUT_FILE}`
await $`git commit -m ${`chore: release ${tag}`}`
await $`git tag ${tag}`

console.log(`✅ Released ${tag}`)
console.log('💡 To push: git push --follow-tags')
