import fs from 'fs'
import os from 'os'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildSystemPrompt } from '../src/providers/prompt'
import type { CompareResult } from '../src/providers/types'

const moveScreenshot = vi.fn()
const imgDiff = vi.fn()
const createProvider = vi.fn()

vi.mock('../src/tasks/moveScreenshot', () => ({
  moveScreenshot,
}))

vi.mock('../src/tasks/imgDiff', () => ({
  imgDiff,
}))

vi.mock('../src/providers/factory', () => ({
  createProvider,
}))

describe('visualEvalPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  async function setupPlugin(options: Record<string, unknown> = {}, configOverrides: Record<string, unknown> = {}) {
    let registeredTasks: Record<string, (...args: any[]) => any> | undefined
    const on = vi.fn((event: string, handlers: Record<string, (...args: any[]) => any>) => {
      if (event === 'task') {
        registeredTasks = handlers
      }
    })

    const config = {
      screenshotsFolder: '/tmp/cypress/screenshots',
      env: {},
      ...configOverrides,
    }

    const { visualEvalPlugin } = await import('../src/plugin')
    visualEvalPlugin(on as any, config as any, options as any)

    expect(registeredTasks).toBeDefined()
    return { on, tasks: registeredTasks! }
  }

  function createPromptFile(contents = 'Focus on layout and text rendering regressions.'): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cve-prompt-'))
    const promptPath = path.join(tempDir, 'visual-eval-prompt.md')
    fs.writeFileSync(promptPath, contents)
    return promptPath
  }

  it('fails compare when the baseline image is missing', async () => {
    createProvider.mockResolvedValue(null)
    moveScreenshot.mockReturnValue('/tmp/eval/missing-baseline.png')
    imgDiff.mockImplementation(() => {
      throw new Error('ENOENT: missing baseline image')
    })

    const { tasks } = await setupPlugin()

    await expect(
      tasks.visualEvalCompareScreenshots({
        name: 'missing-baseline',
        spec: 'spec.cy.ts',
        aiEnabled: true,
        options: {},
      })
    ).rejects.toThrow('missing baseline image')
  })

  it('fails compare when the eval image is missing', async () => {
    createProvider.mockResolvedValue(null)
    moveScreenshot.mockReturnValue('/tmp/eval/missing-eval.png')
    imgDiff.mockImplementation(() => {
      throw new Error('ENOENT: missing eval image')
    })

    const { tasks } = await setupPlugin()

    await expect(
      tasks.visualEvalCompareScreenshots({
        name: 'missing-eval',
        spec: 'spec.cy.ts',
        aiEnabled: true,
        options: {},
      })
    ).rejects.toThrow('missing eval image')
  })

  it('returns a failure reason when AI fallback is disabled', async () => {
    const compare = vi.fn<() => Promise<CompareResult>>()
    createProvider.mockResolvedValue({ compare })
    moveScreenshot.mockReturnValue('/tmp/eval/login.png')
    imgDiff.mockReturnValue({
      pixelCount: 42,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin()
    const result = await tasks.visualEvalCompareScreenshots({
      name: 'login',
      spec: 'auth/spec.cy.ts',
      aiEnabled: false,
      options: { pixelDiffThreshold: 3 },
    })

    expect(result).toEqual({
      pass: false,
      reason: 'Diff of 42 pixels exceeds threshold of 3, AI fallback disabled',
    })
    expect(compare).not.toHaveBeenCalled()
  })

  it('returns a failure reason when AI compare is enabled but no provider is configured', async () => {
    createProvider.mockResolvedValue(null)
    moveScreenshot.mockReturnValue('/tmp/eval/no-provider.png')
    imgDiff.mockReturnValue({
      pixelCount: 12,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin()
    const result = await tasks.visualEvalCompareScreenshots({
      name: 'no-provider',
      spec: 'auth/spec.cy.ts',
      aiEnabled: true,
      options: { pixelDiffThreshold: 3 },
    })

    expect(result).toEqual({
      pass: false,
      reason: 'Difference detected, AI fallback is not configured',
    })
  })

  it('returns early when images are identical', async () => {
    const compare = vi.fn<() => Promise<CompareResult>>()
    createProvider.mockResolvedValue({ compare })
    moveScreenshot.mockReturnValue('/tmp/eval/home.png')
    imgDiff.mockReturnValue({
      pixelCount: 0,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin({ provider: 'openai' })
    const result = await tasks.visualEvalCompareScreenshots({
      name: 'home',
      spec: 'home.cy.ts',
      aiEnabled: true,
      options: { pixelDiffThreshold: 0 },
    })

    expect(result).toEqual({ pass: true, reason: 'Images are identical' })
    expect(compare).not.toHaveBeenCalled()
  })

  it('returns early when the pixel diff is within the threshold', async () => {
    const compare = vi.fn<() => Promise<CompareResult>>()
    createProvider.mockResolvedValue({ compare })
    moveScreenshot.mockReturnValue('/tmp/eval/settings.png')
    imgDiff.mockReturnValue({
      pixelCount: 4,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin({ provider: 'openai' })
    const result = await tasks.visualEvalCompareScreenshots({
      name: 'settings',
      spec: 'settings.cy.ts',
      aiEnabled: true,
      options: { pixelDiffThreshold: 5 },
    })

    expect(result).toEqual({
      pass: true,
      reason: 'Detected diff: 4 <= threshold 5',
    })
    expect(compare).not.toHaveBeenCalled()
  })

  it('returns early when the pixel diff equals the threshold', async () => {
    const compare = vi.fn<() => Promise<CompareResult>>()
    createProvider.mockResolvedValue({ compare })
    moveScreenshot.mockReturnValue('/tmp/eval/settings-equal.png')
    imgDiff.mockReturnValue({
      pixelCount: 5,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin({ provider: 'openai' })
    const result = await tasks.visualEvalCompareScreenshots({
      name: 'settings-equal',
      spec: 'settings.cy.ts',
      aiEnabled: true,
      options: { pixelDiffThreshold: 5 },
    })

    expect(result).toEqual({
      pass: true,
      reason: 'Detected diff: 5 <= threshold 5',
    })
    expect(compare).not.toHaveBeenCalled()
  })

  it('uses the default baseline and evaluation folders when options are omitted', async () => {
    createProvider.mockResolvedValue(null)
    moveScreenshot.mockReturnValue('/tmp/eval/default-paths.png')
    imgDiff.mockReturnValue({
      pixelCount: 9,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin()

    tasks.visualEvalGenerateBase({
      name: 'default-paths',
      spec: 'folder/spec.cy.ts',
      options: {},
    })

    await tasks.visualEvalCompareScreenshots({
      name: 'default-paths',
      spec: 'folder/spec.cy.ts',
      aiEnabled: false,
      options: { pixelDiffThreshold: 0 },
    })

    expect(moveScreenshot).toHaveBeenNthCalledWith(
      1,
      'default-paths',
      'folder/spec.cy.ts',
      '/tmp/cypress/screenshots',
      path.join('cypress', 'baseline')
    )
    expect(moveScreenshot).toHaveBeenNthCalledWith(
      2,
      'default-paths',
      'folder/spec.cy.ts',
      '/tmp/cypress/screenshots',
      path.join('/tmp/cypress/screenshots', 'visualEval'),
      've-'
    )
  })

  it('passes config.env AI_VISUAL_API_KEY into provider creation when options.apiKey is missing', async () => {
    createProvider.mockResolvedValue(null)
    moveScreenshot.mockReturnValue('/tmp/eval/env-key.png')
    imgDiff.mockReturnValue({
      pixelCount: 4,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin(
      { provider: 'claude' },
      { env: { AI_VISUAL_API_KEY: 'env-key' } }
    )

    await tasks.visualEvalCompareScreenshots({
      name: 'env-key',
      spec: 'env.cy.ts',
      aiEnabled: true,
      options: {},
    })

    expect(createProvider).toHaveBeenCalledWith({
      provider: 'claude',
      apiKey: 'env-key',
      model: undefined,
      systemPrompt: buildSystemPrompt(),
    })
  })

  it('does not crash when config.env is missing', async () => {
    createProvider.mockResolvedValue(null)
    moveScreenshot.mockReturnValue('/tmp/eval/no-env.png')
    imgDiff.mockReturnValue({
      pixelCount: 4,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin(
      { provider: 'claude' },
      { env: undefined }
    )

    await tasks.visualEvalCompareScreenshots({
      name: 'no-env',
      spec: 'env.cy.ts',
      aiEnabled: true,
      options: {},
    })

    expect(createProvider).toHaveBeenCalledWith({
      provider: 'claude',
      apiKey: undefined,
      model: undefined,
      systemPrompt: buildSystemPrompt(),
    })
  })

  it('logs debug information only when debug mode is enabled', async () => {
    const compare = vi.fn<() => Promise<CompareResult>>().mockResolvedValue({
      pass: true,
      reason: 'looks good',
    })
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    createProvider.mockResolvedValue({ compare })
    moveScreenshot.mockReturnValue('/tmp/eval/debug.png')
    imgDiff.mockReturnValue({
      pixelCount: 6,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const enabled = await setupPlugin({ provider: 'openai', debug: true })
    await enabled.tasks.visualEvalCompareScreenshots({
      name: 'debug-on',
      spec: 'debug.cy.ts',
      aiEnabled: true,
      options: { pixelDiffThreshold: 0 },
    })

    expect(logSpy).toHaveBeenCalledWith('[cypress-visual-eval] Detected diff: 6, threshold: 0')
    expect(logSpy).toHaveBeenCalledWith('[cypress-visual-eval] "debug-on" — pass: true, reason: looks good')

    logSpy.mockClear()

    const disabled = await setupPlugin({ provider: 'openai', debug: false })
    await disabled.tasks.visualEvalCompareScreenshots({
      name: 'debug-off',
      spec: 'debug.cy.ts',
      aiEnabled: true,
      options: { pixelDiffThreshold: 0 },
    })

    expect(logSpy).not.toHaveBeenCalled()
    logSpy.mockRestore()
  })

  it('creates the provider during compare and surfaces missing-key failure when AI compare runs', async () => {
    const noKeyError = new Error('[cypress-visual-eval] No API key found for provider "openai"')
    createProvider.mockRejectedValue(noKeyError)
    moveScreenshot.mockReturnValue('/tmp/eval/dashboard.png')
    imgDiff.mockReturnValue({
      pixelCount: 5,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin({ provider: 'openai' })

    await expect(
      tasks.visualEvalCompareScreenshots({
        name: 'dashboard',
        spec: 'dashboard.cy.ts',
        aiEnabled: true,
        options: { pixelDiffThreshold: 0 },
      })
    ).rejects.toThrow('No API key found for provider "openai"')

    expect(createProvider).toHaveBeenCalledWith({
      provider: 'openai',
      apiKey: undefined,
      model: undefined,
      systemPrompt: buildSystemPrompt(),
    })
  })

  it('uses plugin-level pixelDiffThreshold when the command does not override it', async () => {
    const compare = vi.fn<() => Promise<CompareResult>>()
    createProvider.mockResolvedValue({ compare })
    moveScreenshot.mockReturnValue('/tmp/eval/plugin-threshold.png')
    imgDiff.mockReturnValue({
      pixelCount: 2,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin({ provider: 'openai', pixelDiffThreshold: 3 })
    const result = await tasks.visualEvalCompareScreenshots({
      name: 'plugin-threshold',
      spec: 'threshold.cy.ts',
      aiEnabled: true,
      options: {},
    })

    expect(result).toEqual({
      pass: true,
      reason: 'Detected diff: 2 <= threshold 3',
    })
    expect(compare).not.toHaveBeenCalled()
  })

  it('lets per-call directories override plugin defaults', async () => {
    createProvider.mockResolvedValue(null)
    moveScreenshot.mockReturnValue('/tmp/eval/override-paths.png')
    imgDiff.mockReturnValue({
      pixelCount: 9,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin({
      baselineDir: 'baseline/default',
      screenshotsDir: '/tmp/screenshots/default',
    })

    tasks.visualEvalGenerateBase({
      name: 'override-paths',
      spec: 'folder/spec.cy.ts',
      options: {
        baselineDir: 'baseline/per-call',
      },
    })

    await tasks.visualEvalCompareScreenshots({
      name: 'override-paths',
      spec: 'folder/spec.cy.ts',
      aiEnabled: false,
      options: {
        screenshotsDir: '/tmp/screenshots/per-call',
      },
    })

    expect(moveScreenshot).toHaveBeenNthCalledWith(
      1,
      'override-paths',
      'folder/spec.cy.ts',
      '/tmp/cypress/screenshots',
      'baseline/per-call'
    )
    expect(moveScreenshot).toHaveBeenNthCalledWith(
      2,
      'override-paths',
      'folder/spec.cy.ts',
      '/tmp/cypress/screenshots',
      '/tmp/screenshots/per-call',
      've-'
    )
  })

  it('creates an override provider lazily when per-call provider settings are supplied', async () => {
    const compare = vi.fn<() => Promise<CompareResult>>().mockResolvedValue({
      pass: true,
      reason: 'override provider',
    })
    const promptPath = createPromptFile('Focus on only severe layout regressions.')

    createProvider.mockResolvedValueOnce({ compare })
    moveScreenshot.mockReturnValue('/tmp/eval/override-provider.png')
    imgDiff.mockReturnValue({
      pixelCount: 7,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin({ debug: false })
    const result = await tasks.visualEvalCompareScreenshots({
      name: 'override-provider',
      spec: 'override.cy.ts',
      aiEnabled: true,
      options: {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        apiKey: 'override-key',
        promptPath,
      },
    })

    expect(result).toEqual({ pass: true, reason: 'override provider' })
    expect(createProvider).toHaveBeenCalledWith({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      apiKey: 'override-key',
      systemPrompt: buildSystemPrompt('Focus on only severe layout regressions.'),
    })
  })

  it('loads a custom prompt file and passes the composed prompt to provider creation', async () => {
    createProvider.mockResolvedValue(null)
    const promptPath = createPromptFile('Focus on layout shifts and text corruption.')
    moveScreenshot.mockReturnValue('/tmp/eval/custom-prompt.png')
    imgDiff.mockReturnValue({
      pixelCount: 4,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin(
      { provider: 'claude', promptPath },
      { projectRoot: '/unused/project-root' }
    )

    await tasks.visualEvalCompareScreenshots({
      name: 'custom-prompt',
      spec: 'prompt.cy.ts',
      aiEnabled: true,
      options: {},
    })

    expect(createProvider).toHaveBeenCalledWith({
      provider: 'claude',
      apiKey: undefined,
      model: undefined,
      systemPrompt: buildSystemPrompt('Focus on layout shifts and text corruption.'),
    })
  })

  it('resolves relative prompt paths from config.projectRoot', async () => {
    createProvider.mockResolvedValue(null)
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cve-project-'))
    const promptsDir = path.join(projectRoot, 'prompts')
    fs.mkdirSync(promptsDir)
    fs.writeFileSync(path.join(promptsDir, 'visual-rules.txt'), 'Be strict about missing icons.')
    moveScreenshot.mockReturnValue('/tmp/eval/relative-prompt.png')
    imgDiff.mockReturnValue({
      pixelCount: 4,
      baselineBase64: 'baseline',
      evalBase64: 'eval',
      diffBase64: 'diff',
    })

    const { tasks } = await setupPlugin(
      { provider: 'openai', promptPath: 'prompts/visual-rules.txt' },
      { projectRoot }
    )

    await tasks.visualEvalCompareScreenshots({
      name: 'relative-prompt',
      spec: 'prompt.cy.ts',
      aiEnabled: true,
      options: {},
    })

    expect(createProvider).toHaveBeenCalledWith({
      provider: 'openai',
      apiKey: undefined,
      model: undefined,
      systemPrompt: buildSystemPrompt('Be strict about missing icons.'),
    })
  })

  it('throws during setup when promptPath has an unsupported extension', async () => {
    await expect(
      setupPlugin({ provider: 'openai', promptPath: 'prompts/visual-rules.json' })
    ).rejects.toThrow('Only .md and .txt files are supported')
  })

  it('throws during setup when the prompt file is missing', async () => {
    await expect(
      setupPlugin(
        { provider: 'openai', promptPath: 'prompts/missing-prompt.md' },
        { projectRoot: '/tmp/non-existent-project-root' }
      )
    ).rejects.toThrow('Failed to read prompt file')
  })
})
