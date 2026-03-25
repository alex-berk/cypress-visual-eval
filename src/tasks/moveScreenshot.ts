import fs from 'fs'
import path from 'path'

export function moveScreenshot(
  name: string,
  from: string,
  to: string
): string {
  const src = path.join(from, `${name}.png`)
  const dest = path.join(to, `${name}.png`)

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.renameSync(src, dest)

  return dest
}
