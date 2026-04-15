import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createProvider } from '../src/providers/factory'
import type { VisualEvalProvider } from '../src/providers/types'
import { SYSTEM_PROMPT } from '../src/providers/prompt'

const providerCases = [
  { provider: 'claude', envVar: 'ANTHROPIC_API_KEY', defaultModel: 'claude-sonnet-4-6' },
  { provider: 'openai', envVar: 'OPENAI_API_KEY', defaultModel: 'gpt-4o' },
  { provider: 'gemini', envVar: 'GEMINI_API_KEY', defaultModel: 'gemini-2.0-flash' },
] as const

vi.mock('../src/providers/claude', () => ({
  ClaudeProvider: class ClaudeProvider {
    model: string
    systemPrompt: string
    constructor(public apiKey: string, systemPrompt?: string, model?: string) {
      this.systemPrompt = systemPrompt ?? SYSTEM_PROMPT
      this.model = model ?? 'claude-sonnet-4-6'
    }
    async compare() { return { pass: true, reason: 'mock' } }
  }
}))
vi.mock('../src/providers/openai', () => ({
  OpenAIProvider: class OpenAIProvider {
    model: string
    systemPrompt: string
    constructor(public apiKey: string, systemPrompt?: string, model?: string) {
      this.systemPrompt = systemPrompt ?? SYSTEM_PROMPT
      this.model = model ?? 'gpt-4o'
    }
    async compare() { return { pass: true, reason: 'mock' } }
  }
}))
vi.mock('../src/providers/gemini', () => ({
  GeminiProvider: class GeminiProvider {
    model: string
    systemPrompt: string
    constructor(public apiKey: string, systemPrompt?: string, model?: string) {
      this.systemPrompt = systemPrompt ?? SYSTEM_PROMPT
      this.model = model ?? 'gemini-2.0-flash'
    }
    async compare() { return { pass: true, reason: 'mock' } }
  }
}))

describe('createProvider', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null when no provider specified', async () => {
    expect(await createProvider({})).toBeNull()
  })

  it('returns null when provider is undefined', async () => {
    expect(await createProvider({ provider: undefined })).toBeNull()
  })

  it('passes through a custom provider instance', async () => {
    const custom: VisualEvalProvider = {
      compare: async () => ({ pass: true, reason: 'ok' }),
    }
    expect(await createProvider({ provider: custom })).toBe(custom)
  })

  it('throws on unknown string provider', async () => {
    await expect(
      createProvider({ provider: 'llama' as any, apiKey: 'key' })
    ).rejects.toThrow('Unknown provider "llama"')
  })

  it('throws when no API key is found', async () => {
    vi.stubEnv('AI_VISUAL_API_KEY', '')
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    await expect(
      createProvider({ provider: 'claude' })
    ).rejects.toThrow('No API key found')
    await expect(
      createProvider({ provider: 'claude' })
    ).rejects.toThrow('ANTHROPIC_API_KEY')
    await expect(
      createProvider({ provider: 'claude' })
    ).rejects.toThrow('cypress.env.json')
  })

  it('resolves API key from config.apiKey first', async () => {
    vi.stubEnv('AI_VISUAL_API_KEY', 'env-key')
    const provider = await createProvider({ provider: 'claude', apiKey: 'config-key' })
    expect(provider).toBeDefined()
  })

  it('resolves API key from AI_VISUAL_API_KEY env var', async () => {
    vi.stubEnv('AI_VISUAL_API_KEY', 'env-key')
    const provider = await createProvider({ provider: 'claude' })
    expect(provider).toBeDefined()
  })

  it.each(providerCases)('creates a $provider provider instance', async ({ provider }) => {
    const instance = await createProvider({ provider, apiKey: 'key' })

    expect(instance).toMatchObject({ apiKey: 'key' })
    expect(instance).toHaveProperty('compare')
  })

  it.each(providerCases)('resolves API key from $envVar for $provider', async ({ provider, envVar }) => {
    vi.stubEnv(envVar, `${provider}-key`)
    const instance = await createProvider({ provider })

    expect(instance).toMatchObject({ apiKey: `${provider}-key` })
    expect(instance).toHaveProperty('compare')
  })

  it.each(providerCases)('uses the default model for $provider', async ({ provider, defaultModel }) => {
    const instance = await createProvider({ provider, apiKey: 'key' })

    expect((instance as any).model).toBe(defaultModel)
  })

  it('passes model through to the provider', async () => {
    const provider = await createProvider({ provider: 'claude', apiKey: 'key', model: 'claude-opus-4-6' })
    expect((provider as any).model).toBe('claude-opus-4-6')
  })

  it('passes systemPrompt through to the provider', async () => {
    const provider = await createProvider({ provider: 'openai', apiKey: 'key', systemPrompt: 'Custom system prompt' })
    expect((provider as any).systemPrompt).toBe('Custom system prompt')
  })
})
