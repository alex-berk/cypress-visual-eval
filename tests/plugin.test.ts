import { beforeEach, describe, expect, it, vi } from 'vitest'
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
      pixelDiffThreshold: 3,
    })

    expect(result).toEqual({
      pass: false,
      reason: 'Diff of 42 pixels exceeds threshold of 3, AI fallback disabled',
    })
    expect(compare).not.toHaveBeenCalled()
  })

  it('creates the provider during startup and surfaces missing-key failure when AI compare runs', async () => {
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

    expect(createProvider).toHaveBeenCalledWith({ provider: 'openai', apiKey: undefined })

    await expect(
      tasks.visualEvalCompareScreenshots({
        name: 'dashboard',
        spec: 'dashboard.cy.ts',
        aiEnabled: true,
        pixelDiffThreshold: 0,
      })
    ).rejects.toThrow('No API key found for provider "openai"')
  })
})
