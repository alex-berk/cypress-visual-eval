import fs from 'fs';
import path from 'path';
import { PNG, PNGWithMetadata } from 'pngjs';
import pixelmatchPkg from "pixelmatch";
const pixelmatch = (pixelmatchPkg as any).default ?? pixelmatchPkg

function loadImangeData(imgPath: string): PNGWithMetadata {
  const imgBuffer = fs.readFileSync(imgPath)
  const loadedImg = PNG.sync.read(imgBuffer)
  return loadedImg
}

export function imgDiff(name: string, screenshotsBaseFolder: string, screenshotsEvalFolder: string, sensitivity?: number): number {
  const imgBasePath = path.join(screenshotsBaseFolder, `${name}.png`)
  const imgEvalPath = path.join(screenshotsEvalFolder, `${name}.png`)
  const imgBase = loadImangeData(imgBasePath)
  const imgEval = loadImangeData(imgEvalPath)

  const { width, height } = imgBase
  const diff = new PNG({ width, height })
  const matchResult = pixelmatch(imgBase.data, imgEval.data, diff.data, width, height, { threshold: sensitivity ?? 0.1 })

  fs.writeFileSync(path.join(screenshotsEvalFolder, `${path.parse(name).name}_diff.png`), PNG.sync.write(diff))
  return matchResult
}
