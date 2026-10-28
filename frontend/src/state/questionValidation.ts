import { MAX_TEXT_LENGTH } from '../constants'
import { codePointLength } from './conversationRules'

export type QuestionValidation =
  | { ok: true; text: string; length: number }
  | { ok: false; reason: 'empty' | 'too_long'; length: number }

/** BR-ENV-01 a BR-ENV-03: apara o texto e confere o tamanho (1 a 2000 pontos de código). */
export function validateQuestion(raw: string): QuestionValidation {
  const text = raw.trim()
  const length = codePointLength(text)
  if (length === 0) return { ok: false, reason: 'empty', length }
  if (length > MAX_TEXT_LENGTH) return { ok: false, reason: 'too_long', length }
  return { ok: true, text, length }
}
