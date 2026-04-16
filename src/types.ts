/// <reference types="cypress" />
import type { ProviderName } from './providers/factory'
import type { VisualEvalProvider } from './providers/types'

export interface VisualEvalRuntimeOptions {
  pixelDiffThreshold?: number
  baselineDir?: string
  screenshotsDir?: string
  promptPath?: string
  debug?: boolean
  provider?: ProviderName
  model?: string
  apiKey?: string
}

export type VisualTestOptions = Cypress.ScreenshotOptions & VisualEvalRuntimeOptions

export interface VisualEvalPluginOptions extends Omit<VisualEvalRuntimeOptions, 'provider'> {
  provider?: ProviderName | VisualEvalProvider
}
