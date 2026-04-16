import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { PNG } from 'pngjs'

const { pixelmatchMock } = vi.hoisted(() => ({
  pixelmatchMock: vi.fn(() => 3),
}))

vi.mock('pixelmatch', () => ({
  default: pixelmatchMock,
}))

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

describe('imgDiff pixelmatch options', () => {
  let tmpDir: string
  let baseDir: string
  let evalDir: string

  beforeEach(() => {
    vi.resetModules()
    pixelmatchMock.mockClear()

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 've-diff-pixelmatch-'))
    baseDir = path.join(tmpDir, 'baseline')
    evalDir = path.join(tmpDir, 'eval')
    fs.mkdirSync(baseDir, { recursive: true })
    fs.mkdirSync(evalDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('passes pixelmatch options through to pixelmatch', async () => {
    fs.writeFileSync(path.join(baseDir, 'opts.png'), createPng(4, 4, 255, 0, 0))
    fs.writeFileSync(path.join(evalDir, 'opts.png'), createPng(4, 4, 0, 0, 255))

    const { imgDiff } = await import('../src/tasks/imgDiff')

    imgDiff('opts', baseDir, evalDir, {
      threshold: 0.2,
      includeAA: true,
      alpha: 0.5,
      aaColor: [1, 2, 3],
      diffColor: [4, 5, 6],
      diffColorAlt: [7, 8, 9],
      diffMask: true,
    })

    expect(pixelmatchMock).toHaveBeenCalledTimes(1)
    expect(pixelmatchMock).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.any(Uint8Array),
      expect.any(Uint8Array),
      4,
      4,
      {
        threshold: 0.2,
        includeAA: true,
        alpha: 0.5,
        aaColor: [1, 2, 3],
        diffColor: [4, 5, 6],
        diffColorAlt: [7, 8, 9],
        diffMask: true,
      }
    )
  })

  it('uses threshold 0.1 by default when no pixelmatch threshold is provided', async () => {
    fs.writeFileSync(path.join(baseDir, 'default-threshold.png'), createPng(4, 4, 255, 0, 0))
    fs.writeFileSync(path.join(evalDir, 'default-threshold.png'), createPng(4, 4, 0, 0, 255))

    const { imgDiff } = await import('../src/tasks/imgDiff')

    imgDiff('default-threshold', baseDir, evalDir, { includeAA: true })

    expect(pixelmatchMock).toHaveBeenCalledTimes(1)
    expect(pixelmatchMock).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.any(Uint8Array),
      expect.any(Uint8Array),
      4,
      4,
      {
        threshold: 0.1,
        includeAA: true,
        alpha: undefined,
        aaColor: undefined,
        diffColor: undefined,
        diffColorAlt: undefined,
        diffMask: undefined,
      }
    )
  })
})
