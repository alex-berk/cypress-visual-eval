/// <reference types="cypress" />
import type { VisualTestOptions } from "./types"

const VISUAL_EVAL_OPTION_KEYS = [
  'pixelDiffThreshold',
  'baselineDir',
  'screenshotsDir',
  'promptPath',
  'debug',
  'provider',
  'model',
  'apiKey',
] as const

type VisualEvalOptionKey = typeof VISUAL_EVAL_OPTION_KEYS[number]

function extractVisualEvalRuntimeOptions(options?: VisualTestOptions): {
  forwardedRuntimeOptions: Record<VisualEvalOptionKey, VisualTestOptions[VisualEvalOptionKey]>
  screenshotOptions: Cypress.ScreenshotOptions
} {
  const forwardedRuntimeOptions = {} as Record<VisualEvalOptionKey, VisualTestOptions[VisualEvalOptionKey]>
  const screenshotOptions: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(options ?? {})) {
    if ((VISUAL_EVAL_OPTION_KEYS as readonly string[]).includes(key)) {
      forwardedRuntimeOptions[key as VisualEvalOptionKey] = value as VisualTestOptions[VisualEvalOptionKey]
    } else {
      screenshotOptions[key] = value
    }
  }

  return {
    forwardedRuntimeOptions,
    screenshotOptions: screenshotOptions as unknown as Cypress.ScreenshotOptions,
  }
}

Cypress.Commands.add('visualTest', (name: string, options?: VisualTestOptions) => {
  const { forwardedRuntimeOptions, screenshotOptions } = extractVisualEvalRuntimeOptions(options)
  const spec = Cypress.spec.name
  const generateBaseline = Cypress.expose('GENERATE_BASELINE') === 'TRUE'
  const aiEnabled = Cypress.expose('VISUAL_EVAL_AI_DISABLED') !== 'TRUE'

  if (generateBaseline) {
    cy.screenshot(name, { ...screenshotOptions, overwrite: true })
    cy.task('visualEvalGenerateBase', { name, spec, options: forwardedRuntimeOptions })
  } else {
    const screenshotPath = `ve-${name}`
    cy.screenshot(screenshotPath, { ...screenshotOptions, overwrite: true })
    cy.task<{ pass: boolean; reason: string }>('visualEvalCompareScreenshots', { name, spec, aiEnabled, options: forwardedRuntimeOptions })
      .then(({ pass, reason }) => {
        expect(pass, reason + '\n').to.be.true
      })
  }
})

declare global {
  namespace Cypress {
    interface Chainable {
      visualTest(name: string, options?: VisualTestOptions): Chainable<void>
    }
  }
}

export { }
