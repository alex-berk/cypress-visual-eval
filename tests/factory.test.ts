import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createProvider } from '../src/providers/factory'
import type { VisualEvalProvider } from '../src/providers/types'

vi.mock('../src/providers/claude', () => ({
  ClaudeProvider: class ClaudeProvider {
    model: string
    constructor(public apiKey: string, model?: string) { this.model = model ?? 'claude-sonnet-4-6' }
    async compare() { return { pass: true, reason: 'mock' } }
  }
}))
vi.mock('../src/providers/openai', () => ({
  OpenAIProvider: class OpenAIProvider {
    model: string
    constructor(public apiKey: string, model?: string) { this.model = model ?? 'gpt-4o' }
    async compare() { return { pass: true, reason: 'mock' } }
  }
}))
vi.mock('../src/providers/gemini', () => ({
  GeminiProvider: class GeminiProvider {
    model: string
    constructor(public apiKey: string, model?: string) { this.model = model ?? 'gemini-2.0-flash' }
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

  it('resolves API key from provider-specific env var', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'anthropic-key')
    const provider = await createProvider({ provider: 'claude' })
    expect(provider).toBeDefined()
    expect((provider as any).model).toBe('claude-sonnet-4-6')
  })

  it('resolves API key from OPENAI_API_KEY env var', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'openai-key')
    const provider = await createProvider({ provider: 'openai' })
    expect(provider).toBeDefined()
    expect((provider as any).model).toBe('gpt-4o')
  })

  it('resolves API key from GEMINI_API_KEY env var', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'gemini-key')
    const provider = await createProvider({ provider: 'gemini' })
    expect(provider).toBeDefined()
    expect((provider as any).model).toBe('gemini-2.0-flash')
  })

  it('creates a provider for "claude"', async () => {
    const provider = await createProvider({ provider: 'claude', apiKey: 'key' })
    expect(provider).toBeDefined()
    expect((provider as any).model).toBe('claude-sonnet-4-6')
  })

  it('creates a provider for "openai"', async () => {
    const provider = await createProvider({ provider: 'openai', apiKey: 'key' })
    expect(provider).toBeDefined()
    expect((provider as any).model).toBe('gpt-4o')
  })

  it('creates a provider for "gemini"', async () => {
    const provider = await createProvider({ provider: 'gemini', apiKey: 'key' })
    expect(provider).toBeDefined()
    expect((provider as any).model).toBe('gemini-2.0-flash')
  })

  it('passes model through to the provider', async () => {
    const provider = await createProvider({ provider: 'claude', apiKey: 'key', model: 'claude-opus-4-6' })
    expect((provider as any).model).toBe('claude-opus-4-6')
  })
})
