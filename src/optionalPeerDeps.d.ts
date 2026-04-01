declare module '@anthropic-ai/sdk' {
  export default class Anthropic {
    constructor(options: { apiKey: string })
    messages: {
      create(options: unknown): Promise<{
        content: Array<{ text: string }>
      }>
    }
  }
}

declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(options: { apiKey: string })
    models: {
      generateContent(options: unknown): Promise<{
        text?: string
      }>
    }
  }
}

declare module 'openai' {
  export default class OpenAI {
    constructor(options: { apiKey: string })
    chat: {
      completions: {
        create(options: unknown): Promise<{
          choices: Array<{
            message: {
              content?: string | null
            }
          }>
        }>
      }
    }
  }
}
