import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    "index": "src/index.ts",
    "commands": "src/commands.ts"
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
})
