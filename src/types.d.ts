declare global {
  namespace Cypress {
    interface Chainable {
      visualTest(name: string, screenshotOptions?: Partial<Cypress.ScreenshotOptions>): Chainable<void>
    }
  }
}

export { }
