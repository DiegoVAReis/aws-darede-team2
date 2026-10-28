import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { ERROR_KINDS, errorText } from './errorMessages'

describe('errorText', () => {
  it('tem um texto em português para todo tipo de erro', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ERROR_KINDS), (kind) => {
        const text = errorText(kind)
        expect(text.trim()).not.toBe('')
        expect(text).toMatch(/[A-Za-zÀ-ÿ]/)
      }),
    )
  })

  it('cobre os oito tipos de erro do Functional Design', () => {
    expect([...ERROR_KINDS].sort()).toEqual(
      [
        'INTERNAL_ERROR',
        'KB_NOT_INDEXED',
        'NETWORK',
        'NO_RESPONSE',
        'TIMEOUT',
        'UNEXPECTED_RESPONSE',
        'UPSTREAM_ERROR',
        'VALIDATION_ERROR',
      ].sort(),
    )
  })
})
