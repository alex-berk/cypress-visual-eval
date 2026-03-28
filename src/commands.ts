/// <reference types="cypress" />
import path from 'path'

Cypress.Commands.add('visualTest', (name: string, screenshotOptions?: Partial<Cypress.ScreenshotOptions>) => {
  const spec = Cypress.spec.name
  const generateBaseline = Cypress.expose('GENERATE_BASELINE') === 'TRUE'
  const aiEnabled = Cypress.expose('VISUAL_EVAL_AI_DISABLED') !== 'TRUE'

  if (generateBaseline) {
    cy.screenshot(name, { overwrite: true, ...screenshotOptions })
    cy.task('visualEvalGenerateBase', { name, spec })
  } else {
    // const screenshotPath = path.join('visualEval', name)
    const screenshotPath = `ve-${name}`
    cy.screenshot(screenshotPath, { overwrite: true, ...screenshotOptions })
    cy.task<{ pass: boolean; reason: string }>('visualEvalCompareScreenshots', { name, spec, aiEnabled }).then(({ pass, reason }) => {
      expect(pass, reason + '\n').to.be.true
    })
  }
})
