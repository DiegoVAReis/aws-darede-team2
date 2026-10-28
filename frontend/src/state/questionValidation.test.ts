import { describe, expect, it } from 'vitest'
import { MAX_TEXT_LENGTH } from '../constants'
import { validateQuestion } from './questionValidation'

describe('validateQuestion', () => {
  it('aceita uma pergunta e devolve o texto aparado', () => {
    expect(validateQuestion('  oi  ')).toEqual({ ok: true, text: 'oi', length: 2 })
  })

  it('rejeita texto vazio ou só espaços', () => {
    expect(validateQuestion('')).toMatchObject({ ok: false, reason: 'empty' })
    expect(validateQuestion(' \n\t ')).toMatchObject({ ok: false, reason: 'empty' })
  })

  it('aceita exatamente 2000 caracteres e rejeita 2001', () => {
    expect(validateQuestion('a'.repeat(MAX_TEXT_LENGTH)).ok).toBe(true)
    expect(validateQuestion('a'.repeat(MAX_TEXT_LENGTH + 1))).toMatchObject({
      ok: false,
      reason: 'too_long',
      length: MAX_TEXT_LENGTH + 1,
    })
  })

  it('conta o tamanho depois de aparar', () => {
    expect(validateQuestion(`  ${'a'.repeat(MAX_TEXT_LENGTH)}  `).ok).toBe(true)
  })

  it('conta pontos de código, não unidades UTF-16', () => {
    expect(validateQuestion('😀'.repeat(MAX_TEXT_LENGTH)).ok).toBe(true)
  })
})
