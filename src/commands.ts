/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      visualTest(name: string): Chainable<void>
    }
  }
}

export { }

Cypress.Commands.add('visualTest', (name?: string) => {
  cy.log(`Hi, ${name || "unkown"}!`)
})
