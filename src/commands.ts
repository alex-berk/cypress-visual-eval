/// <reference types="cypress" />

Cypress.Commands.add('visualTest', (name: string, screenshotOptions?: Partial<Cypress.ScreenshotOptions>) => {
  cy.log(name ?? 'undefinedName')
  cy.screenshot(name, { overwrite: true, ...screenshotOptions })
  if (Cypress.expose('GENERATE_BASELINE') === 'TRUE') {
    cy.task('visualEvalMoveScreenshot', { name, spec: Cypress.spec.name })
  }
})
