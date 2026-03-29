import { describe, it, expect } from 'vitest'
import { parseResponse } from '../src/providers/prompt'

describe('parseResponse', () => {
  it('parses valid JSON with pass: true', () => {
    const result = parseResponse('{"pass": true, "reason": "Images match"}')
    expect(result).toEqual({ pass: true, reason: 'Images match' })
  })

  it('parses valid JSON with pass: false', () => {
    const result = parseResponse('{"pass": false, "reason": "Layout shifted"}')
    expect(result).toEqual({ pass: false, reason: 'Layout shifted' })
  })

  it('strips markdown code fences', () => {
    const result = parseResponse('```json\n{"pass": true, "reason": "OK"}\n```')
    expect(result).toEqual({ pass: true, reason: 'OK' })
  })

  it('strips code fences without language tag', () => {
    const result = parseResponse('```\n{"pass": false, "reason": "broken"}\n```')
    expect(result).toEqual({ pass: false, reason: 'broken' })
  })

  it('handles whitespace around JSON', () => {
    const result = parseResponse('  \n {"pass": true, "reason": "fine"} \n ')
    expect(result).toEqual({ pass: true, reason: 'fine' })
  })

  it('returns failure for invalid JSON', () => {
    const result = parseResponse('not json at all')
    expect(result.pass).toBe(false)
    expect(result.reason).toContain('Could not parse AI response')
    expect(result.reason).toContain('not json at all')
  })

  it('returns failure for empty string', () => {
    const result = parseResponse('')
    expect(result.pass).toBe(false)
    expect(result.reason).toContain('Could not parse AI response')
  })

  it('returns failure when pass is not boolean', () => {
    const result = parseResponse('{"pass": "yes", "reason": "OK"}')
    expect(result.pass).toBe(false)
    expect(result.reason).toContain('Could not parse AI response')
  })

  it('returns failure when reason is not string', () => {
    const result = parseResponse('{"pass": true, "reason": 123}')
    expect(result.pass).toBe(false)
    expect(result.reason).toContain('Could not parse AI response')
  })

  it('returns failure when pass is missing', () => {
    const result = parseResponse('{"reason": "OK"}')
    expect(result.pass).toBe(false)
    expect(result.reason).toContain('Could not parse AI response')
  })

  it('returns failure when reason is missing', () => {
    const result = parseResponse('{"pass": true}')
    expect(result.pass).toBe(false)
    expect(result.reason).toContain('Could not parse AI response')
  })
})
