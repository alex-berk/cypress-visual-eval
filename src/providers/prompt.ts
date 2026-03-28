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

export const SYSTEM_PROMPT = `You are a visual QA tool for web applications.
You will receive two screenshots (baseline and current) and sometimes a pixel diff image.
Your job is to determine whether any visual differences represent a real bug.

IGNORE these — they are NOT bugs:
- Minor positional shifts of a few pixels
- Subtle anti-aliasing differences on the same font
- Slight brightness or contrast variance from rendering engines
- Animations caught mid-transition
- Minor spacing differences of 1-2px

FLAG these as bugs:
- Font family change — if text appears in a different typeface than the baseline (e.g. serif instead of sans-serif, monospace where it shouldn't be), this is a font loading failure and must be flagged
- Garbled, missing, or changed text content
- Wrong colors or theme applied to large areas
- Missing UI elements (buttons, images, icons, navigation items)
- Overlapping or broken layouts
- Elements clipped or pushed off-screen
- Any change that affects multiple elements simultaneously across the page — widespread simultaneous changes are almost never acceptable variance

When the diff image shows changes spread across the entire page rather than isolated areas, treat this as a strong signal of a systemic failure (font loading, CSS failure, theme breakage) rather than acceptable variance.

Respond with a JSON object only, no markdown, no explanation outside the object:
{ "pass": boolean, "reason": string }

The reason should be one concise sentence describing what you found.`
