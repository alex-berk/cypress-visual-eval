import "./cypress"
import { splitVisualTestOptions } from './options'
import type { VisualTestOptions } from "./types"

Cypress.Commands.add('visualTest', (name: string, options?: VisualTestOptions) => {
  const { diffOptions, screenshotOptions } = splitVisualTestOptions(options)
  const spec = Cypress.spec.name
  const generateBaseline = Cypress.expose('GENERATE_BASELINE') === 'TRUE'
  const aiEnabled = Cypress.expose('VISUAL_EVAL_AI_DISABLED') !== 'TRUE'

  if (generateBaseline) {
    cy.screenshot(name, { ...screenshotOptions, overwrite: true })
    cy.task('visualEvalGenerateBase', { name, spec })
  } else {
    const screenshotPath = `ve-${name}`
    cy.screenshot(screenshotPath, { ...screenshotOptions, overwrite: true })
    cy.task<{ pass: boolean; reason: string }>('visualEvalCompareScreenshots', { name, spec, aiEnabled, options: diffOptions })
      .then(({ pass, reason }) => {
        expect(pass, reason + '\n').to.be.true
      })
  }
})

export { }
