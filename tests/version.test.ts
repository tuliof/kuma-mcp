import { describe, expect, test } from 'bun:test'
import { bumpSemver } from '../scripts/version.js'

describe('bumpSemver', () => {
  // ── Patch bumps ──

  test('patch bump increments last segment', () => {
    expect(bumpSemver('1.0.0', 'patch')).toBe('1.0.1')
  })

  test('patch bump handles multi-digit overflow', () => {
    expect(bumpSemver('1.0.9', 'patch')).toBe('1.0.10')
  })

  test('patch bump zeroes nothing (no lower segments)', () => {
    expect(bumpSemver('2.3.7', 'patch')).toBe('2.3.8')
  })

  // ── Minor bumps ──

  test('minor bump increments middle segment and zeroes patch', () => {
    expect(bumpSemver('1.0.0', 'minor')).toBe('1.1.0')
  })

  test('minor bump zeroes patch even if non-zero', () => {
    expect(bumpSemver('1.2.5', 'minor')).toBe('1.3.0')
  })

  test('minor bump handles overflow', () => {
    expect(bumpSemver('1.9.9', 'minor')).toBe('1.10.0')
  })

  // ── Major bumps ──

  test('major bump increments first segment and zeroes minor and patch', () => {
    expect(bumpSemver('1.0.0', 'major')).toBe('2.0.0')
  })

  test('major bump zeroes lower components', () => {
    expect(bumpSemver('2.5.3', 'major')).toBe('3.0.0')
  })

  test('major bump handles overflow', () => {
    expect(bumpSemver('9.99.999', 'major')).toBe('10.0.0')
  })

  // ── Zeroing of lower components ──

  test('minor bump zeroes patch to 0', () => {
    const result = bumpSemver('1.5.99', 'minor')
    expect(result).toBe('1.6.0')
  })

  test('major bump zeroes minor and patch to 0', () => {
    const result = bumpSemver('3.42.7', 'major')
    expect(result).toBe('4.0.0')
  })

  // ── Pre-release suffix support ──

  test('preserves pre-release suffix on patch bump', () => {
    expect(bumpSemver('1.0.0-alpha', 'patch')).toBe('1.0.1-alpha')
  })

  test('preserves pre-release suffix on minor bump', () => {
    expect(bumpSemver('1.0.0-rc.1', 'minor')).toBe('1.1.0-rc.1')
  })

  test('preserves pre-release suffix on major bump', () => {
    expect(bumpSemver('2.0.0-beta.3', 'major')).toBe('3.0.0-beta.3')
  })

  test('zeroes lower components with pre-release suffix', () => {
    expect(bumpSemver('1.5.3-alpha.1', 'minor')).toBe('1.6.0-alpha.1')
  })

  // ── Error cases ──

  test('rejects empty string', () => {
    expect(() => bumpSemver('', 'patch')).toThrow('valid semver string')
  })

  test('rejects non-semver string', () => {
    expect(() => bumpSemver('not-a-version', 'patch')).toThrow('valid semver string')
  })

  test('rejects too few segments', () => {
    expect(() => bumpSemver('1.0', 'patch')).toThrow('valid semver string')
  })

  test('rejects too many segments', () => {
    expect(() => bumpSemver('1.0.0.0', 'patch')).toThrow('valid semver string')
  })

  test('rejects non-numeric segments', () => {
    expect(() => bumpSemver('1.x.0', 'patch')).toThrow('non-numeric')
  })
})
