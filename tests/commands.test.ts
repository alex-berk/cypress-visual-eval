import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('visualTest command', () => {
  const originalCypress = globalThis.Cypress
  const originalCy = (globalThis as any).cy
  const originalExpect = (globalThis as any).expect

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (originalCypress === undefined) {
      delete (globalThis as any).Cypress
    } else {
      globalThis.Cypress = originalCypress
    }

    if (originalCy === undefined) {
      delete (globalThis as any).cy
    } else {
      ;(globalThis as any).cy = originalCy
    }

    if (originalExpect === undefined) {
      delete (globalThis as any).expect
    } else {
      ;(globalThis as any).expect = originalExpect
    }
  })

  async function loadCommand({
    specName = 'spec.cy.ts',
    generateBaseline = 'FALSE',
    aiDisabled = 'FALSE',
    taskResult = { pass: true, reason: 'ok' },
  }: {
    specName?: string
    generateBaseline?: string
    aiDisabled?: string
    taskResult?: { pass: boolean; reason: string }
  } = {}) {
    let visualTest: ((name: string, options?: Record<string, unknown>) => void) | undefined
    const screenshot = vi.fn()
    const task = vi.fn(() => ({
      then(cb: (value: { pass: boolean; reason: string }) => void) {
        cb(taskResult)
      },
    }))

    const cypressStub = {
      spec: { name: specName },
      expose: vi.fn((key: string) => {
        if (key === 'GENERATE_BASELINE') return generateBaseline
        if (key === 'VISUAL_EVAL_AI_DISABLED') return aiDisabled
        return undefined
      }),
      Commands: {
        add: vi.fn((name: string, fn: (name: string, options?: Record<string, unknown>) => void) => {
          if (name === 'visualTest') {
            visualTest = fn
          }
        }),
      },
    }

    globalThis.Cypress = cypressStub as any
    ;(globalThis as any).cy = { screenshot, task }
    ;(globalThis as any).expect = (value: boolean, _message?: string) => ({
      to: {
        be: {
          get true() {
            expect(value).toBe(true)
            return true
          },
        },
      },
    })

    await import('../src/commands')

    expect(visualTest).toBeDefined()
    return { visualTest: visualTest!, screenshot, task, cypressStub }
  }

  it('uses the nested screenshot name for compare-mode screenshots', async () => {
    const { visualTest, screenshot, task } = await loadCommand({
      specName: 'nested/spec.cy.ts',
    })

    visualTest('auth/login/form', {
      capture: 'viewport',
      pixelDiffThreshold: 7,
      provider: 'openai',
      model: 'gpt-4.1-mini',
      debug: true,
    })

    expect(screenshot).toHaveBeenCalledWith('ve-auth/login/form', {
      capture: 'viewport',
      overwrite: true,
    })
    expect(task).toHaveBeenCalledWith('visualEvalCompareScreenshots', {
      name: 'auth/login/form',
      spec: 'nested/spec.cy.ts',
      aiEnabled: true,
      options: {
        pixelDiffThreshold: 7,
        provider: 'openai',
        model: 'gpt-4.1-mini',
        debug: true,
      },
    })
  })

  it('passes aiEnabled=false to the compare task when AI is disabled', async () => {
    const { visualTest, screenshot, task, cypressStub } = await loadCommand({
      aiDisabled: 'TRUE',
    })

    visualTest('dashboard/summary')

    expect(cypressStub.expose).toHaveBeenCalledWith('VISUAL_EVAL_AI_DISABLED')
    expect(screenshot).toHaveBeenCalledWith('ve-dashboard/summary', { overwrite: true })
    expect(task).toHaveBeenCalledWith('visualEvalCompareScreenshots', {
      name: 'dashboard/summary',
      spec: 'spec.cy.ts',
      aiEnabled: false,
      options: {},
    })
  })

  it('uses baseline-generation mode when GENERATE_BASELINE is enabled', async () => {
    const { visualTest, screenshot, task, cypressStub } = await loadCommand({
      generateBaseline: 'TRUE',
    })

    visualTest('landing-page', {
      capture: 'runner',
      baselineDir: 'custom/baseline',
      promptPath: 'prompts/rules.md',
    })

    expect(cypressStub.expose).toHaveBeenCalledWith('GENERATE_BASELINE')
    expect(screenshot).toHaveBeenCalledWith('landing-page', {
      capture: 'runner',
      overwrite: true,
    })
    expect(task).toHaveBeenCalledWith('visualEvalGenerateBase', {
      name: 'landing-page',
      spec: 'spec.cy.ts',
      options: {
        baselineDir: 'custom/baseline',
        promptPath: 'prompts/rules.md',
      },
    })
  })

  it('passes default compare-mode options through when no custom options are provided', async () => {
    const { visualTest, screenshot, task } = await loadCommand()

    visualTest('checkout')

    expect(screenshot).toHaveBeenCalledWith('ve-checkout', { overwrite: true })
    expect(task).toHaveBeenCalledWith('visualEvalCompareScreenshots', {
      name: 'checkout',
      spec: 'spec.cy.ts',
      aiEnabled: true,
      options: {},
    })
  })

  it('surfaces the compare failure reason through the command assertion', async () => {
    const { visualTest } = await loadCommand({
      taskResult: { pass: false, reason: 'Visual regression detected' },
    })

    expect(() => visualTest('profile')).toThrow('expected false to be true')
  })
})
