/// <reference types="cypress" />
import path from 'path'
import { moveScreenshot } from "./tasks/moveScreenshot";
import { imgDiff } from "./tasks/imgDiff";
import { createProvider, ProviderConfig } from './providers/factory';
import { CompareResult } from './providers/types';

export type VisualEvalOptions = ProviderConfig & {
  baselineDir?: string,
  screenshotsDir?: string
}

export function visualEvalPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options: VisualEvalOptions = {}
) {
  const cypressScreenshotsFolder = config.screenshotsFolder as string
  const screenshotsBaseFolder = options.baselineDir ?? path.join('cypress', 'baseline')
  const screenshotsEvalFolder = options.screenshotsDir ?? path.join(cypressScreenshotsFolder, 'visualEval')

  options.apiKey = options.apiKey || config.env?.AI_VISUAL_API_KEY
  const provider = createProvider(options)

  on('task', {
    visualEvalGenerateBase({ name, spec }: { name: string, spec: string }): string {
      return moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsBaseFolder)
    },
    async visualEvalCompareScreenshots({ name, spec, aiEnabled, threshold }: { name: string, spec: string, aiEnabled: boolean, threshold?: number }): Promise<CompareResult> {
      moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsEvalFolder, 've-')
      const { pixelCount, baselineBase64, evalBase64, diffBase64 } =
        imgDiff(name, screenshotsBaseFolder, screenshotsEvalFolder, threshold)
      if (aiEnabled && pixelCount >= 0) {
        if (!provider) {
          return { pass: false, reason: 'Difference detected, AI fallback is not configured' }
        }
        return provider.compare(baselineBase64, evalBase64, diffBase64);
      } else {
        const pass = pixelCount === 0
        const reason = pass ? 'Images are identical' : 'Differences detected, AI fallback disabled'
        return { pass, reason }
      }
    }
  })
}
