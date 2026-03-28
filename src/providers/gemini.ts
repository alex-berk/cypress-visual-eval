import { VisualEvalProvider, CompareResult } from './types'
import { SYSTEM_PROMPT, parseResponse } from './prompt'

export class GeminiProvider implements VisualEvalProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey
    this.model = model ?? 'gemini-1.5-pro'
  }

  async compare(
    baselineBase64: string,
    screenshotBase64: string,
    diffBase64?: string,
  ): Promise<CompareResult> {
    let GoogleGenerativeAI: any
    try {
      GoogleGenerativeAI = (await import('@google/generative-ai')).GoogleGenerativeAI
    } catch {
      throw new Error('[cypress-visual-eval] @google/generative-ai is not installed. Run: npm install -D @google/generative-ai')
    }

    const client = new GoogleGenerativeAI(this.apiKey)
    const model = client.getGenerativeModel({
      model: this.model,
      systemInstruction: SYSTEM_PROMPT,
    })

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

    const response = await model.generateContent(parts)
    return parseResponse(response.response.text())
  }
}
