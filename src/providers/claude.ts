import { VisualEvalProvider, CompareResult } from './types'
import { SYSTEM_PROMPT, parseResponse } from './prompt'

export class ClaudeProvider implements VisualEvalProvider {
  private apiKey: string
  private model: string
  private systemPrompt: string

  constructor(apiKey: string, systemPrompt?: string, model?: string) {
    this.apiKey = apiKey
    this.systemPrompt = systemPrompt ?? SYSTEM_PROMPT
    this.model = model ?? 'claude-sonnet-4-6'
  }

  async compare(
    baselineBase64: string,
    screenshotBase64: string,
    diffBase64?: string,
  ): Promise<CompareResult> {
    let Anthropic: any
    try {
      Anthropic = (await import('@anthropic-ai/sdk')).default
    } catch {
      throw new Error('[cypress-visual-eval] @anthropic-ai/sdk is not installed. Run: npm install -D @anthropic-ai/sdk')
    }

    const client = new Anthropic({ apiKey: this.apiKey })

    const images: any[] = [
      { type: 'text', text: 'Baseline screenshot:' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: baselineBase64 } },
      { type: 'text', text: 'Current screenshot:' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 } },
    ]

    if (diffBase64) {
      images.push(
        { type: 'text', text: 'Pixel diff (red/yellow = changed pixels):' },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: diffBase64 } },
      )
    }

    const response = await client.messages.create({
      model: this.model,
      max_tokens: 256,
      system: this.systemPrompt,
      messages: [{ role: 'user', content: images }],
    })

    return parseResponse(response.content[0].text)
  }
}
