/// <reference types="cypress" />
import type { ProviderName } from './providers/factory'
import type { VisualEvalProvider } from './providers/types'

export interface PixelmatchOptions {
  threshold?: number
  includeAA?: boolean
  alpha?: number
  aaColor?: [number, number, number]
  diffColor?: [number, number, number]
  diffColorAlt?: [number, number, number]
  diffMask?: boolean
}

export interface VisualEvalTaskOptions {
  pixelDiffThreshold?: number
}

export type VisualDiffOptions = VisualEvalTaskOptions & PixelmatchOptions

export type VisualScreenshotOptions = Omit<Cypress.ScreenshotOptions, 'overwrite'>

export type VisualTestOptions = VisualScreenshotOptions & VisualDiffOptions

export interface VisualEvalPluginOptions extends VisualDiffOptions {
  baselineDir?: string
  screenshotsDir?: string
  promptPath?: string
  debug?: boolean
  provider?: ProviderName | VisualEvalProvider
  model?: string
  apiKey?: string
}
