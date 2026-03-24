declare global {
  namespace Cypress {
    interface Chainable {
      visualTest(name: string): Chainable<void>
    }
  }
}

export { }
