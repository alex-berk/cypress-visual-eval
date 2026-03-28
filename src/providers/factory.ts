import { VisualEvalProvider } from './types'

export type ProviderName = 'claude' | 'openai' | 'gemini'

export interface ProviderConfig {
  provider?: ProviderName | VisualEvalProvider
  model?: string
  apiKey?: string
}

export function createProvider(config: ProviderConfig): VisualEvalProvider | null {
  if (!config.provider) return null
  if (typeof config.provider !== 'string') {
    return config.provider
  }

  const apiKey = resolveApiKey(config)

  switch (config.provider) {
    case 'claude': {
      const { ClaudeProvider } = require('./claude')
      return new ClaudeProvider(apiKey, config.model)
    }
    case 'openai': {
      const { OpenAIProvider } = require('./openai')
      return new OpenAIProvider(apiKey, config.model)
    }
    case 'gemini': {
      const { GeminiProvider } = require('./gemini')
      return new GeminiProvider(apiKey, config.model)
    }
    default:
      throw new Error(`[cypress-visual-eval] Unknown provider "${config.provider}". Valid options: claude, openai, gemini`)
  }
}

function resolveApiKey(config: ProviderConfig): string {
  const providerEnvKeys: Record<ProviderName, string> = {
    claude: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    gemini: 'GEMINI_API_KEY',
  }

  const key =
    config.apiKey ??
    process.env.AI_VISUAL_API_KEY ??
    process.env[providerEnvKeys[config.provider as ProviderName]]

  if (!key) {
    throw new Error(
      `[cypress-visual-eval] No API key found for provider "${config.provider}". ` +
      `Set AI_VISUAL_API_KEY or ${providerEnvKeys[config.provider as ProviderName]} in your environment, ` +
      `or add AI_VISUAL_API_KEY to cypress.env.json.`
    )
  }

  return key
}
