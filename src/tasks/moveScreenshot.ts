import fs from 'fs'
import path from 'path'

export function moveScreenshot(
  name: string,
  spec: string,
  from: string,
  to: string,
  namePrefix?: string
): string {
  const srcName = namePrefix ? `${namePrefix}${name}` : name
  const src = path.join(from, spec, `${srcName}.png`)
  const dest = path.join(to, `${name}.png`)

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.renameSync(src, dest)

  return dest
}
