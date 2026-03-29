import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { moveScreenshot } from '../src/tasks/moveScreenshot'

describe('moveScreenshot', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 've-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function createSource(spec: string, name: string) {
    const specDir = path.join(tmpDir, 'from', spec)
    fs.mkdirSync(specDir, { recursive: true })
    const filePath = path.join(specDir, `${name}.png`)
    fs.writeFileSync(filePath, 'fake-png')
    return filePath
  }

  it('moves file from source to destination', () => {
    createSource('spec.cy.ts', 'button')
    const dest = moveScreenshot('button', 'spec.cy.ts', path.join(tmpDir, 'from'), path.join(tmpDir, 'to'))

    expect(dest).toBe(path.join(tmpDir, 'to', 'button.png'))
    expect(fs.existsSync(dest)).toBe(true)
    expect(fs.readFileSync(dest, 'utf-8')).toBe('fake-png')
  })

  it('creates destination directory if it does not exist', () => {
    createSource('spec.cy.ts', 'hero')
    const destDir = path.join(tmpDir, 'deep', 'nested', 'dir')
    const dest = moveScreenshot('hero', 'spec.cy.ts', path.join(tmpDir, 'from'), destDir)

    expect(fs.existsSync(dest)).toBe(true)
  })

  it('removes file from source after move', () => {
    const src = createSource('spec.cy.ts', 'card')
    moveScreenshot('card', 'spec.cy.ts', path.join(tmpDir, 'from'), path.join(tmpDir, 'to'))

    expect(fs.existsSync(src)).toBe(false)
  })

  it('handles namePrefix for source lookup', () => {
    const specDir = path.join(tmpDir, 'from', 'spec.cy.ts')
    fs.mkdirSync(specDir, { recursive: true })
    fs.writeFileSync(path.join(specDir, 've-login.png'), 'prefixed')

    const dest = moveScreenshot('login', 'spec.cy.ts', path.join(tmpDir, 'from'), path.join(tmpDir, 'to'), 've-')

    expect(fs.existsSync(dest)).toBe(true)
    expect(fs.readFileSync(dest, 'utf-8')).toBe('prefixed')
    // destination name should NOT have the prefix
    expect(path.basename(dest)).toBe('login.png')
  })

  it('throws when source file does not exist', () => {
    expect(() =>
      moveScreenshot('missing', 'spec.cy.ts', path.join(tmpDir, 'from'), path.join(tmpDir, 'to'))
    ).toThrow()
  })
})
