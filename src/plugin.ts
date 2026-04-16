/// <reference types="cypress" />
import fs from 'fs'
import path from 'path'
import { moveScreenshot } from "./tasks/moveScreenshot"
import { imgDiff } from "./tasks/imgDiff"
import { createProvider } from './providers/factory'
import { buildSystemPrompt } from './providers/prompt'
import { CompareResult } from './providers/types'
import type { PixelmatchOptions, VisualDiffOptions, VisualEvalPluginOptions } from './types'

type VisualEvalNodeGenerateBaseTaskPayload = {
  name: string
  spec: string
}

type VisualEvalNodeCompareTaskPayload = {
  name: string
  spec: string
  aiEnabled: boolean
  options?: VisualDiffOptions
}

export function visualEvalPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options: VisualEvalPluginOptions = {}
) {
  const cypressScreenshotsFolder = config.screenshotsFolder as string
  const projectRoot = config.projectRoot || process.cwd()
  const resolvedPluginDefaults = resolvePluginDefaults(options, config, projectRoot)

  on('task', {
    visualEvalGenerateBase({ name, spec }: VisualEvalNodeGenerateBaseTaskPayload): string {
      const screenshotsBaseFolder = resolvedPluginDefaults.baselineDir ?? path.join('cypress', 'baseline')
      return moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsBaseFolder)
    },
    async visualEvalCompareScreenshots({ name, spec, aiEnabled, options: diffOptions }: VisualEvalNodeCompareTaskPayload): Promise<CompareResult> {
      const screenshotsBaseFolder = resolvedPluginDefaults.baselineDir ?? path.join('cypress', 'baseline')
      const screenshotsEvalFolder = resolvedPluginDefaults.screenshotsDir ?? path.join(cypressScreenshotsFolder, 'visualEval')
      const pixelDiffThreshold = diffOptions?.pixelDiffThreshold ?? resolvedPluginDefaults.pixelDiffThreshold ?? 0
      const pixelmatchOptions: PixelmatchOptions = {
        threshold: diffOptions?.threshold ?? resolvedPluginDefaults.threshold,
        includeAA: diffOptions?.includeAA ?? resolvedPluginDefaults.includeAA,
        alpha: diffOptions?.alpha ?? resolvedPluginDefaults.alpha,
        aaColor: diffOptions?.aaColor ?? resolvedPluginDefaults.aaColor,
        diffColor: diffOptions?.diffColor ?? resolvedPluginDefaults.diffColor,
        diffColorAlt: diffOptions?.diffColorAlt ?? resolvedPluginDefaults.diffColorAlt,
        diffMask: diffOptions?.diffMask ?? resolvedPluginDefaults.diffMask,
      }

      moveScreenshot(name, spec, cypressScreenshotsFolder, screenshotsEvalFolder, 've-')
      const { pixelCount, baselineBase64, evalBase64, diffBase64 } =
        imgDiff(name, screenshotsBaseFolder, screenshotsEvalFolder, pixelmatchOptions)
      if (resolvedPluginDefaults.debug) {
        console.log(`[cypress-visual-eval] Detected diff: ${pixelCount}, threshold: ${pixelDiffThreshold}`)
      }
      if (pixelCount === 0) {
        return { pass: true, reason: 'Images are identical' }
      }
      if (pixelCount <= pixelDiffThreshold) {
        return { pass: true, reason: `Detected diff: ${pixelCount} <= threshold ${pixelDiffThreshold}` }
      }
      if (aiEnabled) {
        const provider = await createProvider({
          provider: resolvedPluginDefaults.provider,
          model: resolvedPluginDefaults.model,
          apiKey: resolvedPluginDefaults.apiKey,
          systemPrompt: resolvedPluginDefaults.systemPrompt,
        })
        if (!provider) {
          return { pass: false, reason: 'Difference detected, AI fallback is not configured' }
        }
        const result = await provider.compare(baselineBase64, evalBase64, diffBase64)
        if (resolvedPluginDefaults.debug) {
          console.log(`[cypress-visual-eval] "${name}" — pass: ${result.pass}, reason: ${result.reason}`)
        }
        return result
      }
      return { pass: false, reason: `Diff of ${pixelCount} pixels exceeds threshold of ${pixelDiffThreshold}, AI fallback disabled` }
    }
  })
}

function resolvePluginDefaults(
  options: VisualEvalPluginOptions,
  config: Cypress.PluginConfigOptions,
  projectRoot: string
) {
  const apiKey = options.apiKey || config.env?.AI_VISUAL_API_KEY
  const customPrompt = options.promptPath ? readPromptFile(options.promptPath, projectRoot) : undefined

  return {
    ...options,
    apiKey,
    systemPrompt: buildSystemPrompt(customPrompt),
  }
}

function readPromptFile(promptPath: string, projectRoot: string): string {
  const resolvedPath = path.isAbsolute(promptPath) ? promptPath : path.resolve(projectRoot, promptPath)
  const extension = path.extname(resolvedPath).toLowerCase()

  if (extension !== '.md' && extension !== '.txt') {
    throw new Error(
      `[cypress-visual-eval] Unsupported prompt file "${promptPath}". Only .md and .txt files are supported.`
    )
  }

  try {
    return fs.readFileSync(resolvedPath, 'utf8')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`[cypress-visual-eval] Failed to read prompt file "${promptPath}": ${message}`)
  }
}
