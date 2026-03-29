import { CompareResult } from './types'

export function parseResponse(raw: string): CompareResult {
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (typeof parsed.pass !== 'boolean' || typeof parsed.reason !== 'string') {
      throw new Error('Invalid shape')
    }
    return parsed
  } catch {
    return {
      pass: false,
      reason: `[cypress-visual-eval] Could not parse AI response: ${raw}`,
    }
  }
}

export const SYSTEM_PROMPT = `You are reviewing a visual regression test for a web app.

You will receive 3 images in this exact order:
1. BASELINE screenshot — the expected correct UI
2. COMPARE screenshot — the UI produced during the test
3. DIFF image — changed pixels highlighted between BASELINE and COMPARE. Change is represented with red and yellow pixels

Your task is to decide whether the test should pass.

Important context:
- This AI check runs only after a visual diff was already detected and the diff size exceeded a threshold.
- Because of that, be sensitive to regressions rather than conservative.
- If a visible difference looks unintended, degraded, suspicious, or user-noticeable, treat it as a bug.
- Use the DIFF image only to find changed areas. The decision must be based on comparing BASELINE vs COMPARE.

Fail the test for things like:
- typography changed noticeably (wrong font family, serif vs sans-serif, wrong weight, wrong glyph shapes, fallback font appearance)
- text rendered as squares, tofu, garbled symbols, or wrong characters
- layout shifts that are visibly noticeable
- clipped, overlapped, misaligned, or duplicated elements
- missing icons, images, buttons, labels, or sections
- broken spacing, wrapping, alignment, or sizing
- meaningful color/style/state regressions
- anything that would look visually wrong to a human reviewer
- any noticeable text appearance change, even if the text content is identical

Pass the test only if the differences are clearly harmless, such as:
- tiny anti-aliasing noise
- very small subpixel rendering differences
- negligible pixel-level changes that do not visibly change the UI

Decision rule:
- Be biased toward failing when there is a real visible regression.
- If unsure between harmless and buggy, prefer failing.

Return exactly one JSON object in this schema:
{ "pass": boolean, "reason": string }

Output rules:
- "pass": true means no visual bug
- "pass": false when there is a visual bug/regression
- "reason" must be one short sentence explaining the reasoning behind your decision

Important rule:
- Return JSON only, with NO markdown, NO extra text, and NO code fences`
