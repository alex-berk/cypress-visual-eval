/// <reference types="cypress" />
import path from 'path'
import { moveScreenshot } from "./tasks/moveScreenshot";
import { imgDiff } from "./tasks/imgDiff";
import { createProvider, ProviderConfig } from './providers/factory';
import { CompareResult } from './providers/types';

export type VisualEvalOptions = ProviderConfig & {
  baselineDir?: string,
  screenshotsDir?: string,
  prompt?: string,
  debug?: boolean
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
  const providerPromise = createProvider(options)

  on('task', {
    visualEvalGenerateBase({ name, spec }: { name: string, spec: string }): string {
      return moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsBaseFolder)
    },
    async visualEvalCompareScreenshots({ name, spec, aiEnabled, pixelDiffThreshold = 0 }: { name: string, spec: string, aiEnabled: boolean, pixelDiffThreshold?: number }): Promise<CompareResult> {
      moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsEvalFolder, 've-')
      const { pixelCount, baselineBase64, evalBase64, diffBase64 } =
        imgDiff(name, screenshotsBaseFolder, screenshotsEvalFolder)
      if (options.debug) {
        console.log(`[cypress-visual-eval] Detected diff: ${pixelCount}, threshold: ${pixelDiffThreshold}`)
      }
      if (pixelCount === 0) {
        return { pass: true, reason: 'Images are identical' }
      }
      if (pixelCount <= pixelDiffThreshold) {
        return { pass: true, reason: `Detected diff: ${pixelCount} <= threshold ${pixelDiffThreshold}` }
      }
      if (aiEnabled) {
        const provider = await providerPromise
        if (!provider) {
          return { pass: false, reason: 'Difference detected, AI fallback is not configured' }
        }
        const result = await provider.compare(baselineBase64, evalBase64, diffBase64);
        if (options.debug) {
          console.log(`[cypress-visual-eval] "${name}" — pass: ${result.pass}, reason: ${result.reason}`)
        }
        return result
      }
    }
  })
}
