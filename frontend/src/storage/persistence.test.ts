import { describe, expect, it } from 'vitest'
import { STORAGE_VERSION } from '../constants'
import { makeConversation, makeMessage } from '../test/helpers'
import type { Conversation, PersistedState } from '../types'
import { parseState, serializeState } from './persistence'

function persisted(conversations: Conversation[], active = conversations[0]!.id): PersistedState {
  return { version: STORAGE_VERSION, activeConversationId: active, conversations }
}

const valid = (id: string, extra: Partial<Conversation> = {}): Conversation =>
  makeConversation({
    id,
    title: 'Garantia',
    messages: [
      makeMessage({ id: `${id}-1`, role: 'user', content: 'Qual a garantia?' }),
      makeMessage({
        id: `${id}-2`,
        role: 'assistant',
        content: '12 meses',
        sources: [{ file: 'maquinas_agricolas_catalogo.md', title: 'Catálogo' }],
        contextReset: true,
      }),
    ],
    ...extra,
  })

describe('parseState', () => {
  it('lê de volta o que serializeState gravou', () => {
    const state = persisted([valid('a'), valid('b')], 'b')
    expect(parseState(serializeState(state))).toEqual(state)
  })

  it('devolve null para ausência de dados, JSON inválido e versão desconhecida', () => {
    expect(parseState(null)).toBeNull()
    expect(parseState('')).toBeNull()
    expect(parseState('{ não é json')).toBeNull()
    expect(parseState('[]')).toBeNull()
    expect(parseState(JSON.stringify({ ...persisted([valid('a')]), version: 99 }))).toBeNull()
    expect(parseState(JSON.stringify({ version: STORAGE_VERSION }))).toBeNull()
  })

  it('devolve null se nenhuma conversa for válida', () => {
    const state = JSON.stringify({ version: STORAGE_VERSION, activeConversationId: 'a', conversations: [{ id: 'a' }] })
    expect(parseState(state)).toBeNull()
  })

  it('descarta só as conversas inválidas e mantém as demais (BR-PER-04)', () => {
    const text = JSON.stringify({
      version: STORAGE_VERSION,
      activeConversationId: 'a',
      conversations: [valid('a'), { ...valid('b'), sessionId: 'tem espaço' }, 42, valid('c')],
    })
    expect(parseState(text)?.conversations.map((c) => c.id)).toEqual(['a', 'c'])
  })

  it('descarta ids e sessionIds repetidos mantendo o primeiro', () => {
    const text = JSON.stringify({
      version: STORAGE_VERSION,
      activeConversationId: 'a',
      conversations: [valid('a'), valid('a'), valid('b', { sessionId: 'sessao-a' })],
    })
    expect(parseState(text)?.conversations.map((c) => c.id)).toEqual(['a'])
  })

  it('seleciona a mais recente quando a conversa ativa não existe (BR-PER-05)', () => {
    const state = persisted(
      [valid('a', { updatedAt: '2026-06-01T10:00:00.000Z' }), valid('b', { updatedAt: '2026-06-01T11:00:00.000Z' })],
      'inexistente',
    )
    expect(parseState(JSON.stringify(state))?.activeConversationId).toBe('b')
  })

  it.each([
    ['título vazio', { title: '' }],
    ['título com espaços nas pontas', { title: ' x ' }],
    ['título acima de 60 caracteres', { title: 'x'.repeat(61) }],
    ['titleIsCustom ausente', { titleIsCustom: undefined }],
    ['mensagens que não são lista', { messages: 'nada' }],
    [
      'mensagens com id repetido',
      {
        messages: [
          makeMessage({ id: 'm', role: 'user' }),
          makeMessage({ id: 'm', role: 'assistant' }),
        ],
      },
    ],
  ])('rejeita a conversa com %s', (_name, override) => {
    const text = JSON.stringify(persisted([{ ...valid('a'), ...override } as Conversation, valid('b')]))
    expect(parseState(text)?.conversations.map((c) => c.id)).toEqual(['b'])
  })

  it.each([
    ['usuário com fontes', makeMessage({ id: 'x', role: 'user', sources: [{ file: 'a.md', title: 'A' }] })],
    ['usuário com contextReset', makeMessage({ id: 'x', role: 'user', contextReset: true })],
    ['erro sem errorKind', makeMessage({ id: 'x', role: 'assistant', isError: true })],
    ['erro de usuário', makeMessage({ id: 'x', role: 'user', isError: true, errorKind: 'NETWORK' })],
    ['errorKind desconhecido', makeMessage({ id: 'x', role: 'assistant', isError: true, errorKind: 'XYZ' as never })],
    ['erro com fontes', makeMessage({ id: 'x', role: 'assistant', isError: true, errorKind: 'NETWORK', sources: [{ file: 'a.md', title: 'A' }] })],
    ['errorKind sem isError', makeMessage({ id: 'x', role: 'assistant', errorKind: 'NETWORK' })],
  ])('rejeita mensagem inválida: %s', (_name, message) => {
    const conversation = valid('a', { messages: [message] })
    expect(parseState(JSON.stringify(persisted([conversation, valid('b')])))?.conversations.map((c) => c.id)).toEqual(['b'])
  })

  it('remove fontes repetidas ao ler (INV-08)', () => {
    const conversation = valid('a', {
      messages: [
        makeMessage({
          id: 'm1',
          role: 'assistant',
          sources: [
            { file: 'a.md', title: 'A' },
            { file: 'a.md', title: 'A' },
          ],
        }),
      ],
    })
    const parsed = parseState(JSON.stringify(persisted([conversation])))
    expect(parsed?.conversations[0]?.messages[0]?.sources).toEqual([{ file: 'a.md', title: 'A' }])
  })
})

describe('serializeState', () => {
  it('não grava campos de execução', () => {
    const text = serializeState(persisted([valid('a')]))
    expect(Object.keys(JSON.parse(text))).toEqual(['version', 'activeConversationId', 'conversations'])
  })
})
