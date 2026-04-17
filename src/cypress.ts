/// <reference types="cypress" />
import type { VisualTestOptions } from "./types"

declare global {
  namespace Cypress {
    interface Chainable {
      visualTest(name: string, options?: VisualTestOptions): Chainable<void>
    }
  }
}

export { }
