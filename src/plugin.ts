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
    visualEvalMoveScreenshot({ name, spec }: { name: string, spec: string }) {
      return moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsFolder)
    },
  })
}
