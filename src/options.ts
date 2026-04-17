import type {
  PixelmatchOptions,
  VisualDiffOptions,
  VisualScreenshotOptions,
  VisualTestOptions,
} from './types'

const PIXELMATCH_OPTION_KEYS = [
  'threshold',
  'includeAA',
  'alpha',
  'aaColor',
  'diffColor',
  'diffColorAlt',
  'diffMask',
] as const

export const VISUAL_DIFF_OPTION_KEYS = [
  'pixelDiffThreshold',
  ...PIXELMATCH_OPTION_KEYS,
] as const

type VisualDiffOptionKey = typeof VISUAL_DIFF_OPTION_KEYS[number]
const VISUAL_DIFF_OPTION_KEY_SET = new Set<string>(VISUAL_DIFF_OPTION_KEYS)

export function splitVisualTestOptions(options?: VisualTestOptions): {
  diffOptions: VisualDiffOptions
  screenshotOptions: VisualScreenshotOptions
} {
  const diffOptions: Partial<Record<VisualDiffOptionKey, VisualTestOptions[VisualDiffOptionKey]>> = {}
  const screenshotOptions: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(options ?? {})) {
    if (VISUAL_DIFF_OPTION_KEY_SET.has(key)) {
      diffOptions[key as VisualDiffOptionKey] = value as VisualTestOptions[VisualDiffOptionKey]
    } else {
      screenshotOptions[key] = value
    }
  }

  return {
    diffOptions: diffOptions as VisualDiffOptions,
    screenshotOptions: screenshotOptions as VisualScreenshotOptions,
  }
}

export function mergeVisualDiffOptions(
  defaults?: VisualDiffOptions,
  overrides?: VisualDiffOptions
): VisualDiffOptions {
  const merged: Partial<Record<VisualDiffOptionKey, VisualDiffOptions[VisualDiffOptionKey]>> = {}

  for (const key of VISUAL_DIFF_OPTION_KEYS) {
    merged[key] = overrides?.[key] ?? defaults?.[key]
  }

  return merged as VisualDiffOptions
}

export function toPixelmatchOptions(options?: VisualDiffOptions): PixelmatchOptions {
  const pixelmatchOptions: Partial<Record<typeof PIXELMATCH_OPTION_KEYS[number], PixelmatchOptions[typeof PIXELMATCH_OPTION_KEYS[number]]>> = {}

  for (const key of PIXELMATCH_OPTION_KEYS) {
    pixelmatchOptions[key] = options?.[key]
  }

  return pixelmatchOptions as PixelmatchOptions
}
