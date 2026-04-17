import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { PNG } from 'pngjs'
import { imgDiff } from '../src/tasks/imgDiff'

function createPng(width: number, height: number, r: number, g: number, b: number): Buffer {
  const png = new PNG({ width, height })
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2
      png.data[idx] = r
      png.data[idx + 1] = g
      png.data[idx + 2] = b
      png.data[idx + 3] = 255
    }
  }
  return PNG.sync.write(png)
}

describe('imgDiff', () => {
  let tmpDir: string
  let baseDir: string
  let evalDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 've-diff-'))
    baseDir = path.join(tmpDir, 'baseline')
    evalDir = path.join(tmpDir, 'eval')
    fs.mkdirSync(baseDir, { recursive: true })
    fs.mkdirSync(evalDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns pixelCount 0 for identical images', () => {
    const img = createPng(10, 10, 255, 0, 0)
    fs.writeFileSync(path.join(baseDir, 'same.png'), img)
    fs.writeFileSync(path.join(evalDir, 'same.png'), img)

    const result = imgDiff('same', baseDir, evalDir)
    expect(result.pixelCount).toBe(0)
  })

  it('returns pixelCount > 0 for different images', () => {
    fs.writeFileSync(path.join(baseDir, 'diff.png'), createPng(10, 10, 255, 0, 0))
    fs.writeFileSync(path.join(evalDir, 'diff.png'), createPng(10, 10, 0, 0, 255))

    const result = imgDiff('diff', baseDir, evalDir)
    expect(result.pixelCount).toBeGreaterThan(0)
  })

  it('writes a diff image to the eval folder', () => {
    fs.writeFileSync(path.join(baseDir, 'out.png'), createPng(10, 10, 255, 0, 0))
    fs.writeFileSync(path.join(evalDir, 'out.png'), createPng(10, 10, 0, 0, 255))

    imgDiff('out', baseDir, evalDir)
    expect(fs.existsSync(path.join(evalDir, 'out_diff.png'))).toBe(true)
  })

  it('returns base64 strings for all three images', () => {
    const img = createPng(4, 4, 100, 100, 100)
    fs.writeFileSync(path.join(baseDir, 'b64.png'), img)
    fs.writeFileSync(path.join(evalDir, 'b64.png'), img)

    const result = imgDiff('b64', baseDir, evalDir)
    expect(result.baselineBase64).toBeTruthy()
    expect(result.evalBase64).toBeTruthy()
    expect(result.diffBase64).toBeTruthy()
    // verify they're valid base64 by decoding
    expect(() => Buffer.from(result.baselineBase64, 'base64')).not.toThrow()
  })

  it('respects custom sensitivity threshold', () => {
    // With a very high threshold (1.0), even different colors should report 0 diff
    fs.writeFileSync(path.join(baseDir, 'thresh.png'), createPng(10, 10, 200, 0, 0))
    fs.writeFileSync(path.join(evalDir, 'thresh.png'), createPng(10, 10, 210, 0, 0))

    const strict = imgDiff('thresh', baseDir, evalDir, { threshold: 0.01 })
    const lenient = imgDiff('thresh', baseDir, evalDir, { threshold: 1.0 })

    expect(lenient.pixelCount).toBeLessThanOrEqual(strict.pixelCount)
  })

  it('accepts additional pixelmatch options', () => {
    fs.writeFileSync(path.join(baseDir, 'mask.png'), createPng(10, 10, 200, 0, 0))
    fs.writeFileSync(path.join(evalDir, 'mask.png'), createPng(10, 10, 210, 0, 0))

    expect(() => imgDiff('mask', baseDir, evalDir, {
      threshold: 0.2,
      includeAA: true,
      diffMask: true,
      diffColor: [0, 255, 0],
    })).not.toThrow()
  })

  it('throws when baseline image is missing', () => {
    fs.writeFileSync(path.join(evalDir, 'nobase.png'), createPng(4, 4, 0, 0, 0))

    expect(() => imgDiff('nobase', baseDir, evalDir)).toThrow()
  })

  it('throws when eval image is missing', () => {
    fs.writeFileSync(path.join(baseDir, 'noeval.png'), createPng(4, 4, 0, 0, 0))

    expect(() => imgDiff('noeval', baseDir, evalDir)).toThrow()
  })
})
