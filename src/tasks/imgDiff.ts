import fs from 'fs';
import path from 'path';
import { PNG, PNGWithMetadata } from 'pngjs';
import pixelmatchPkg from "pixelmatch";
const pixelmatch = (pixelmatchPkg as any).default ?? pixelmatchPkg

function loadImage(imgPath: string): PNGWithMetadata {
  const imgBuffer = fs.readFileSync(imgPath)
  const loadedImg = PNG.sync.read(imgBuffer)
  return loadedImg
}

function toBase64(imgPath: string): string {
  return fs.readFileSync(imgPath).toString('base64')
}

export interface ImgDiffResult {
  pixelCount: number,
  baselineBase64: string,
  evalBase64: string,
  diffBase64: string
}

export function imgDiff(name: string, screenshotsBaseFolder: string, screenshotsEvalFolder: string, sensitivity?: number): ImgDiffResult {
  const imgBasePath = path.join(screenshotsBaseFolder, `${name}.png`)
  const imgEvalPath = path.join(screenshotsEvalFolder, `${name}.png`)
  const imgBase = loadImage(imgBasePath)
  const imgEval = loadImage(imgEvalPath)

  const { width, height } = imgBase
  const diff = new PNG({ width, height })
  const pixelCount = pixelmatch(imgBase.data, imgEval.data, diff.data, width, height, { threshold: sensitivity ?? 0.1 })

  const diffPath = path.join(screenshotsEvalFolder, `${path.parse(name).name}_diff.png`)
  fs.writeFileSync(diffPath, PNG.sync.write(diff))
  const diffBase64 = toBase64(diffPath)
  return { pixelCount, baselineBase64: toBase64(imgBasePath), evalBase64: toBase64(imgEvalPath), diffBase64 }
}
