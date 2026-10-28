import { describe, expect, it } from 'vitest'
import { DEFAULT_TITLE } from '../constants'
import type { Conversation } from '../types'
import {
  codePointLength,
  dedupeSources,
  deriveTitle,
  isEmptyConversation,
  normalizeRename,
  sortConversations,
} from './conversationRules'

function conv(id: string, updatedAt: string, messages = 0): Conversation {
  return {
    id,
    sessionId: `s-${id}`,
    title: id,
    titleIsCustom: false,
    messages: Array.from({ length: messages }, (_, i) => ({
      id: `${id}-${i}`,
      role: 'user' as const,
      content: 'x',
      sources: [],
      createdAt: updatedAt,
    })),
    createdAt: updatedAt,
    updatedAt,
  }
}

describe('codePointLength', () => {
  it('conta emojis como um caractere', () => {
    expect(codePointLength('a😀b')).toBe(3)
    expect('a😀b'.length).toBe(4)
  })
})

describe('deriveTitle', () => {
  it('mantém perguntas curtas', () => {
    expect(deriveTitle('Qual a garantia dos tratores?')).toBe('Qual a garantia dos tratores?')
  })

  it('corta em 40 caracteres e acrescenta reticência', () => {
    const title = deriveTitle('Quais são os procedimentos de manutenção preventiva das colheitadeiras?')
    expect(title).toBe('Quais são os procedimentos de manutenção…')
    expect(Array.from(title).length).toBeLessThanOrEqual(41)
  })

  it('troca quebras de linha e espaços repetidos por um espaço', () => {
    expect(deriveTitle('  oi\n\n   tudo   bem  ')).toBe('oi tudo bem')
  })

  it('usa o título padrão quando não há texto', () => {
    expect(deriveTitle('   \n ')).toBe(DEFAULT_TITLE)
  })

  it('não parte um emoji ao cortar', () => {
    const title = deriveTitle('😀'.repeat(60))
    expect(title).toBe(`${'😀'.repeat(40)}…`)
  })
})

describe('normalizeRename', () => {
  it('apara as pontas', () => {
    expect(normalizeRename('  Garantia  ')).toBe('Garantia')
  })

  it('devolve null para título vazio ou só espaços', () => {
    expect(normalizeRename('')).toBeNull()
    expect(normalizeRename('   ')).toBeNull()
  })

  it('limita a 60 caracteres', () => {
    expect(Array.from(normalizeRename('a'.repeat(80)) ?? '').length).toBe(60)
  })
})

describe('dedupeSources', () => {
  it('mantém a primeira ocorrência e a ordem', () => {
    const result = dedupeSources([
      { file: 'a.md', title: 'A' },
      { file: 'b.md', title: 'B' },
      { file: 'a.md', title: 'A2' },
    ])
    expect(result).toEqual([
      { file: 'a.md', title: 'A' },
      { file: 'b.md', title: 'B' },
    ])
  })
})

describe('sortConversations', () => {
  it('ordena da mais recente para a mais antiga sem alterar a entrada', () => {
    const input = [conv('a', '2026-01-01'), conv('b', '2026-03-01'), conv('c', '2026-02-01')]
    const result = sortConversations(input)
    expect(result.map((c) => c.id)).toEqual(['b', 'c', 'a'])
    expect(input.map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })

  it('mantém a ordem existente nos empates', () => {
    const input = [conv('a', '2026-01-01'), conv('b', '2026-01-01')]
    expect(sortConversations(input).map((c) => c.id)).toEqual(['a', 'b'])
  })
})

describe('isEmptyConversation', () => {
  it('é verdadeiro só sem mensagens', () => {
    expect(isEmptyConversation(conv('a', '2026-01-01', 0))).toBe(true)
    expect(isEmptyConversation(conv('a', '2026-01-01', 1))).toBe(false)
  })
})
