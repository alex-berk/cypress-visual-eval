Cypress.Commands.add('visualTest', (name?: string) => {
  cy.log(`Hi, ${name || "unkown"}!`)
})
