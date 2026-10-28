import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { AUTO_TITLE_LENGTH, DEFAULT_TITLE, MAX_TEXT_LENGTH, MAX_TITLE_LENGTH } from '../constants'
import { arbIso, arbSourcesWithDuplicates, arbText } from '../test/arbitraries'
import { makeConversation } from '../test/helpers'
import {
  codePointLength,
  dedupeSources,
  deriveTitle,
  normalizeRename,
  sortConversations,
} from './conversationRules'
import { validateQuestion } from './questionValidation'

describe('deriveTitle (propriedades)', () => {
  it('nunca é vazio, não tem espaços nas pontas e cabe em 40 caracteres mais a reticência', () => {
    fc.assert(
      fc.property(arbText, (text) => {
        const title = deriveTitle(text)
        expect(title).not.toBe('')
        expect(title).toBe(title.trim())
        expect(codePointLength(title)).toBeLessThanOrEqual(AUTO_TITLE_LENGTH + 1)
      }),
    )
  })

  it('é o título padrão ou um prefixo do texto normalizado', () => {
    fc.assert(
      fc.property(arbText, (text) => {
        const title = deriveTitle(text)
        const normalized = text.replace(/\s+/g, ' ').trim()
        if (title === DEFAULT_TITLE && normalized === '') return
        const body = title.endsWith('…') ? title.slice(0, -1) : title
        expect(normalized.startsWith(body)).toBe(true)
      }),
    )
  })

  it('é idempotente quando não houve corte', () => {
    fc.assert(
      fc.property(arbText, (text) => {
        const title = deriveTitle(text)
        if (title.endsWith('…')) return
        expect(deriveTitle(title)).toBe(title)
      }),
    )
  })
})

describe('normalizeRename (propriedades)', () => {
  it('nunca devolve vazio, espaços nas pontas ou mais de 60 caracteres; só espaços vira null', () => {
    fc.assert(
      fc.property(arbText, (text) => {
        const result = normalizeRename(text)
        if (text.trim() === '') {
          expect(result).toBeNull()
          return
        }
        expect(result).not.toBeNull()
        expect(result).toBe(result!.trim())
        expect(codePointLength(result!)).toBeLessThanOrEqual(MAX_TITLE_LENGTH)
      }),
    )
  })
})

describe('validateQuestion (propriedades)', () => {
  it('aceita se e somente se o texto aparado tem de 1 a 2000 pontos de código', () => {
    const arbSized = fc.oneof(
      arbText,
      fc.integer({ min: 1990, max: 2010 }).map((n) => 'a'.repeat(n)),
      fc.integer({ min: 1990, max: 2010 }).map((n) => `  ${'😀'.repeat(n)}  `),
    )
    fc.assert(
      fc.property(arbSized, (raw) => {
        const trimmed = raw.trim()
        const size = codePointLength(trimmed)
        const result = validateQuestion(raw)
        expect(result.ok).toBe(size >= 1 && size <= MAX_TEXT_LENGTH)
        if (result.ok) expect(result.text).toBe(trimmed)
      }),
    )
  })
})

describe('dedupeSources (propriedades)', () => {
  it('é idempotente, sem arquivos repetidos, subsequência da entrada e preserva a ordem', () => {
    fc.assert(
      fc.property(arbSourcesWithDuplicates, (sources) => {
        const once = dedupeSources(sources)
        expect(dedupeSources(once)).toEqual(once)

        const files = once.map((s) => s.file)
        expect(new Set(files).size).toBe(files.length)

        const firstOccurrences = sources.filter((s, i) => sources.findIndex((o) => o.file === s.file) === i)
        expect(once).toEqual(firstOccurrences)
      }),
    )
  })
})

describe('sortConversations (propriedades)', () => {
  it('é uma permutação da entrada, com data não crescente, sem alterar a entrada', () => {
    fc.assert(
      fc.property(fc.array(arbIso, { maxLength: 8 }), (dates) => {
        const input = dates.map((updatedAt, i) => makeConversation({ id: `c${i}`, updatedAt }))
        const snapshot = input.map((c) => c.id)
        const sorted = sortConversations(input)

        expect(input.map((c) => c.id)).toEqual(snapshot)
        expect(sorted.map((c) => c.id).sort()).toEqual([...snapshot].sort())
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i - 1]!.updatedAt >= sorted[i]!.updatedAt).toBe(true)
        }
      }),
    )
  })
})
