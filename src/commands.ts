/// <reference types="cypress" />
import type { VisualDiffOptions, VisualTestOptions } from "./types"

const VISUAL_DIFF_OPTION_KEYS = [
  'pixelDiffThreshold',
  'threshold',
  'includeAA',
  'alpha',
  'aaColor',
  'diffColor',
  'diffColorAlt',
  'diffMask',
] as const

type VisualDiffOptionKey = typeof VISUAL_DIFF_OPTION_KEYS[number]

function extractVisualDiffOptions(options?: VisualTestOptions): {
  forwardedDiffOptions: Record<VisualDiffOptionKey, VisualTestOptions[VisualDiffOptionKey]>
  screenshotOptions: Cypress.ScreenshotOptions
} {
  const forwardedDiffOptions = {} as Record<VisualDiffOptionKey, VisualTestOptions[VisualDiffOptionKey]>
  const screenshotOptions: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(options ?? {})) {
    if ((VISUAL_DIFF_OPTION_KEYS as readonly string[]).includes(key)) {
      forwardedDiffOptions[key as VisualDiffOptionKey] = value as VisualTestOptions[VisualDiffOptionKey]
    } else {
      screenshotOptions[key] = value
    }
  }

  return {
    forwardedDiffOptions,
    screenshotOptions: screenshotOptions as unknown as Cypress.ScreenshotOptions,
  }
}

Cypress.Commands.add('visualTest', (name: string, options?: VisualTestOptions) => {
  const { forwardedDiffOptions, screenshotOptions } = extractVisualDiffOptions(options)
  const spec = Cypress.spec.name
  const generateBaseline = Cypress.expose('GENERATE_BASELINE') === 'TRUE'

  if (generateBaseline) {
    cy.screenshot(name, { ...screenshotOptions, overwrite: true })
    cy.task('visualEvalGenerateBase', { name, spec })
  } else {
    const aiEnabled = Cypress.expose('VISUAL_EVAL_AI_DISABLED') !== 'TRUE'
    const screenshotPath = `ve-${name}`
    cy.screenshot(screenshotPath, { ...screenshotOptions, overwrite: true })
    cy.task<{ pass: boolean; reason: string }>('visualEvalCompareScreenshots', { name, spec, aiEnabled, options: forwardedDiffOptions })
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
