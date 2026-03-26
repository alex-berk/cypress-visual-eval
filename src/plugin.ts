/// <reference types="cypress" />
import path from 'path'
import { moveScreenshot } from "./tasks/moveScreenshot";
import { compareToBase } from "./tasks/compareToBase";
// import { promptAi } from "./tasks/promptAi";

export function visualEvalPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) {
  const cypressScreenshotsFolder = config.screenshotsFolder as string
  const screenshotsBaseFolder = path.join('cypress', 'baseline')
  const screenshotsEvalFolder = path.join(cypressScreenshotsFolder, 'visualEval')

  on('task', {
    visualEvalGenerateBase({ name, spec }: { name: string, spec: string }) {
      return moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsBaseFolder)
    },
    visualEvalCompareScreenshots({ name, spec, aiEnabled, threshold = 0 }: { name: string, spec: string, aiEnabled: boolean, threshold?: number }) {
      moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsEvalFolder, 've-')
      const diff = compareToBase(name, threshold)
      if (aiEnabled && diff >= threshold) {
        return null
        // return promptAi()
      } else {
        return diff <= threshold
      }
    }
  })
}
