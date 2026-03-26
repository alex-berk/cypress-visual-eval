import fs from 'fs'
import path from 'path'

export function moveScreenshot(
  name: string,
  spec: string,
  from: string,
  to: string
): string {
  const src = path.join(from, spec, `${name}.png`)
  const dest = path.join(to, `${name}.png`)

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.renameSync(src, dest)

  return dest
}
