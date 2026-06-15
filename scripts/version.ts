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

/** Full package.json with known `version` field and an index signature for all other fields. */
interface MutablePackageJson extends PackageJsonShape {
  [key: string]: unknown
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

export function bumpSemver(current: string, bumpType: BumpType): string {
  // Handle pre-release suffix (e.g., 1.0.0-alpha.1, 2.0.0-rc.0)
  const prereleaseIndex = current.indexOf('-')
  const versionPart = prereleaseIndex === -1 ? current : current.slice(0, prereleaseIndex)
  const prereleaseSuffix = prereleaseIndex === -1 ? '' : current.slice(prereleaseIndex)

  const parts = versionPart.split('.')

  if (parts.length !== 3) {
    throw new Error(
      `Cannot bump version: "${current}" is not a valid semver string (expected MAJOR.MINOR.PATCH)`,
    )
  }

  const numericParts = parts.map(Number)
  const hasInvalidPart = numericParts.some((p) => Number.isNaN(p))

  if (hasInvalidPart) {
    throw new Error(`Cannot bump version: "${current}" contains non-numeric segments`)
  }

  const bumpIndex: Record<BumpType, number> = { major: 0, minor: 1, patch: 2 }
  const index = bumpIndex[bumpType]

  // Zero out all parts below the bump index
  for (let i = index + 1; i < 3; i++) {
    numericParts[i] = 0
  }

  const currentValue = numericParts[index]

  if (currentValue === undefined) {
    throw new Error(`Version part at index ${index} is undefined for "${current}"`)
  }

  numericParts[index] = currentValue + 1

  return `${numericParts.join('.')}${prereleaseSuffix}`
}

async function writePackageVersion(newVersion: string): Promise<void> {
  const pkgFile = Bun.file(PACKAGE_FILE)
  const pkg = (await pkgFile.json()) as MutablePackageJson
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

// ── Rollback helpers ──

/**
 * Reads the current on-disk content of a file.
 * Returns an empty string if the file does not exist (e.g., first release with no CHANGELOG.md yet).
 */
async function readFileContent(path: string): Promise<string> {
  const file = Bun.file(path)
  const exists = await file.exists()
  if (!exists) {
    return ''
  }
  return file.text()
}

async function restoreFile(path: string, content: string): Promise<void> {
  await Bun.write(path, content)
}

// ── Main ──

if (import.meta.main) {
  const bumpType = parseBumpType(Bun.argv[2])

  await verifyCleanWorkingTree()
  await verifyGitCliff()

  const currentVersion = await readPackageVersion()
  const newVersion = bumpSemver(currentVersion, bumpType)
  const tag = `v${newVersion}`

  console.log(`📦 Bumping version: ${currentVersion} → ${newVersion}`)

  // Snapshot originals before any modifications (for atomic rollback)
  const originalPkg = await readFileContent(PACKAGE_FILE)
  const originalChangelog = await readFileContent(OUTPUT_FILE)

  try {
    await writePackageVersion(newVersion)

    console.log(`📝 Finalizing changelog for ${tag}...`)
    await finalizeChangelog(tag)

    console.log('📦 Committing release...')
    await $`git add ${PACKAGE_FILE} ${OUTPUT_FILE}`
    await $`git commit -m ${`chore: release ${tag}`}`
    await $`git tag ${tag}`

    console.log(`✅ Released ${tag}`)
    console.log('💡 To push: git push --follow-tags')
  } catch (error) {
    // Roll back file modifications so the repo stays consistent
    await restoreFile(PACKAGE_FILE, originalPkg)
    await restoreFile(OUTPUT_FILE, originalChangelog)

    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Release failed — changes reverted: ${message}`)
    process.exit(1)
  }
}
