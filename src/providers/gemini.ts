import { VisualEvalProvider, CompareResult } from './types'
import { SYSTEM_PROMPT, parseResponse } from './prompt'

export class GeminiProvider implements VisualEvalProvider {
  private apiKey: string
  private model: string
  private systemPrompt: string

  constructor(apiKey: string, systemPrompt?: string, model?: string) {
    this.apiKey = apiKey
    this.systemPrompt = systemPrompt ?? SYSTEM_PROMPT
    this.model = model ?? 'gemini-2.0-flash'
  }

  async compare(
    baselineBase64: string,
    screenshotBase64: string,
    diffBase64?: string,
  ): Promise<CompareResult> {
    let GoogleGenAI: any
    try {
      GoogleGenAI = (await import('@google/genai')).GoogleGenAI
    } catch {
      throw new Error('[cypress-visual-eval] @google/genai is not installed. Run: npm install -D @google/genai')
    }

    const client = new GoogleGenAI({ apiKey: this.apiKey })

    const parts: any[] = [
      { text: 'Baseline screenshot:' },
      { inlineData: { mimeType: 'image/png', data: baselineBase64 } },
      { text: 'Current screenshot:' },
      { inlineData: { mimeType: 'image/png', data: screenshotBase64 } },
    ]

    if (diffBase64) {
      parts.push(
        { text: 'Pixel diff (red/yellow = changed pixels):' },
        { inlineData: { mimeType: 'image/png', data: diffBase64 } },
      )
    }

    const response = await client.models.generateContent({
      model: this.model,
      contents: [{ parts }],
      config: { systemInstruction: this.systemPrompt },
    })
    return parseResponse(response.text ?? '')
  }
}
