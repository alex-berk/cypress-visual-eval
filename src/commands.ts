/// <reference types="cypress" />
import type { VisualTestOptions } from "./types"

Cypress.Commands.add('visualTest', (name: string, options?: Partial<VisualTestOptions>) => {
  const { pixelDiffThreshold, ...screenshotOptions } = options ?? {}
  const spec = Cypress.spec.name
  const generateBaseline = Cypress.expose('GENERATE_BASELINE') === 'TRUE'
  const aiEnabled = Cypress.expose('VISUAL_EVAL_AI_DISABLED') !== 'TRUE'

  if (generateBaseline) {
    cy.screenshot(name, { overwrite: true, ...screenshotOptions })
    cy.task('visualEvalGenerateBase', { name, spec })
  } else {
    const screenshotPath = `ve-${name}`
    cy.screenshot(screenshotPath, { overwrite: true, ...screenshotOptions })
    cy.task<{ pass: boolean; reason: string }>('visualEvalCompareScreenshots', { name, spec, aiEnabled, pixelDiffThreshold })
      .then(({ pass, reason }) => {
        expect(pass, reason + '\n').to.be.true
      })
  }
})

declare global {
  namespace Cypress {
    interface Chainable {
      visualTest(name: string, options?: Partial<VisualTestOptions>): Chainable<void>
    }
  }
}

export { }
