/// <reference types="cypress" />
import { moveScreenshot } from "./tasks/moveScreenshot";

export function visualEvalPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options: { screenshotsFolder?: string | boolean }
) {
  const screenshotsFolder = options.screenshotsFolder as string ?? 'cypress/baseline'
  const cypressScreenshotsFolder = config.screenshotsFolder as string
  on('task', {
    visualEvalMoveScreenshot({ name }: { name: string }) {
      return moveScreenshot(name, cypressScreenshotsFolder, screenshotsFolder)
    },
  })
}
