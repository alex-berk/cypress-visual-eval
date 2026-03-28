export interface CompareResult {
  pass: boolean
  reason: string
}

export interface VisualEvalProvider {
  compare(
    baselineBase64: string,
    screenshotBase64: string,
    diffBase64?: string,
  ): Promise<CompareResult>
}
