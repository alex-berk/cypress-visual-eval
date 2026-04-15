import { VisualEvalProvider, CompareResult } from './types'
import { SYSTEM_PROMPT, parseResponse } from './prompt'

export class OpenAIProvider implements VisualEvalProvider {
  private apiKey: string
  private model: string
  private systemPrompt: string

  constructor(apiKey: string, systemPrompt?: string, model?: string) {
    this.apiKey = apiKey
    this.systemPrompt = systemPrompt ?? SYSTEM_PROMPT
    this.model = model ?? 'gpt-4o'
  }

  async compare(
    baselineBase64: string,
    screenshotBase64: string,
    diffBase64?: string,
  ): Promise<CompareResult> {
    let OpenAI: any
    try {
      OpenAI = (await import('openai')).default
    } catch {
      throw new Error('[cypress-visual-eval] openai is not installed. Run: npm install -D openai')
    }

    const client = new OpenAI({ apiKey: this.apiKey })

    const images: any[] = [
      { type: 'text', text: 'Baseline screenshot:' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${baselineBase64}` } },
      { type: 'text', text: 'Current screenshot:' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotBase64}` } },
    ]

    if (diffBase64) {
      images.push(
        { type: 'text', text: 'Pixel diff (red/yellow = changed pixels):' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${diffBase64}` } },
      )
    }

    const response = await client.chat.completions.create({
      model: this.model,
      max_tokens: 256,
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: images },
      ],
    })

    return parseResponse(response.choices[0].message.content ?? '')
  }
}
