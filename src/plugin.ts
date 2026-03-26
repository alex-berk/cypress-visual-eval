/// <reference types="cypress" />
import path from 'path'
import { moveScreenshot } from "./tasks/moveScreenshot";
import { imgDiff } from "./tasks/imgDiff";
// import { promptAi } from "./tasks/promptAi";

export function visualEvalPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
) {
  const cypressScreenshotsFolder = config.screenshotsFolder as string
  const screenshotsBaseFolder = path.join('cypress', 'baseline')
  const screenshotsEvalFolder = path.join(cypressScreenshotsFolder, 'visualEval')

  on('task', {
    visualEvalGenerateBase({ name, spec }: { name: string, spec: string }): string {
      return moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsBaseFolder)
    },
    visualEvalCompareScreenshots({ name, spec, aiEnabled, threshold }: { name: string, spec: string, aiEnabled: boolean, threshold?: number }) {
      moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsEvalFolder, 've-')
      const { pixelCount, baselineBase64, evalBase64, diffBase64 } = imgDiff(name, screenshotsBaseFolder, screenshotsEvalFolder, threshold)
      if (aiEnabled && pixelCount >= 0) {
        throw new Error('AI wasn\'t set up')
      } else {
        return pixelCount === 0
      }
    }
  })
}
