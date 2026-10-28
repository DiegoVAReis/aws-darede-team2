import { describe, expect, it } from 'vitest'
import { DEFAULT_TITLE } from '../constants'
import { makeConversation, makeMessage, makeState } from '../test/helpers'
import type { Message } from '../types'
import {
  canRetryConversation,
  conversationsReducer,
  createConversation,
  createInitialState,
} from './conversationsReducer'

const NOW = '2026-06-02T10:00:00.000Z'

const user = (id: string, content = 'Qual a garantia?'): Message =>
  makeMessage({ id, role: 'user', content })
const answer = (id: string, extra: Partial<Message> = {}): Message =>
  makeMessage({ id, role: 'assistant', content: 'Doze meses.', ...extra })
const errorBubble = (id: string): Message =>
  makeMessage({
    id,
    role: 'assistant',
    content: 'erro',
    isError: true,
    errorKind: 'NETWORK',
  })

describe('create', () => {
  it('cria e seleciona uma conversa vazia quando não há nenhuma vazia', () => {
    const state = makeState([makeConversation({ id: 'a', messages: [user('m1')] })])
    const fresh = createConversation('b', 'sessao-b', NOW)
    const next = conversationsReducer(state, { type: 'create', fresh })
    expect(next.conversations.map((c) => c.id)).toEqual(['a', 'b'])
    expect(next.activeConversationId).toBe('b')
  })

  it('reutiliza a conversa vazia existente em vez de criar outra (BR-CNV-03)', () => {
    const state = makeState(
      [
        makeConversation({ id: 'a', messages: [user('m1')] }),
        makeConversation({ id: 'vazia', updatedAt: '2026-06-01T13:00:00.000Z' }),
      ],
      'a',
    )
    const next = conversationsReducer(state, {
      type: 'create',
      fresh: createConversation('b', 'sessao-b', NOW),
    })
    expect(next.conversations).toHaveLength(2)
    expect(next.activeConversationId).toBe('vazia')
  })

  it('não muda nada se a conversa vazia já é a ativa', () => {
    const state = makeState([makeConversation({ id: 'vazia' })])
    const next = conversationsReducer(state, {
      type: 'create',
      fresh: createConversation('b', 'sessao-b', NOW),
    })
    expect(next).toBe(state)
  })
})

describe('select', () => {
  it('seleciona uma conversa existente e ignora id desconhecido', () => {
    const state = makeState([makeConversation({ id: 'a' }), makeConversation({ id: 'b' })], 'a')
    expect(conversationsReducer(state, { type: 'select', id: 'b' }).activeConversationId).toBe('b')
    expect(conversationsReducer(state, { type: 'select', id: 'x' })).toBe(state)
  })
})

describe('rename', () => {
  const state = makeState([makeConversation({ id: 'a', title: 'Antigo' })])

  it('aplica o título aparado, marca como personalizado e atualiza a data', () => {
    const next = conversationsReducer(state, { type: 'rename', id: 'a', title: '  Garantia  ', now: NOW })
    expect(next.conversations[0]).toMatchObject({ title: 'Garantia', titleIsCustom: true, updatedAt: NOW })
  })

  it('ignora título vazio e conversa inexistente', () => {
    expect(conversationsReducer(state, { type: 'rename', id: 'a', title: '   ', now: NOW })).toBe(state)
    expect(conversationsReducer(state, { type: 'rename', id: 'x', title: 'Novo', now: NOW })).toBe(state)
  })

  it('corta títulos acima de 60 caracteres', () => {
    const next = conversationsReducer(state, { type: 'rename', id: 'a', title: 'x'.repeat(100), now: NOW })
    expect(Array.from(next.conversations[0]!.title)).toHaveLength(60)
  })
})

describe('delete', () => {
  const replacement = createConversation('repo', 'sessao-repo', NOW)

  it('seleciona a conversa mais recente das restantes ao excluir a ativa (BR-CNV-05)', () => {
    const state = makeState(
      [
        makeConversation({ id: 'a', updatedAt: '2026-06-01T10:00:00.000Z' }),
        makeConversation({ id: 'b', updatedAt: '2026-06-01T11:00:00.000Z' }),
        makeConversation({ id: 'c', updatedAt: '2026-06-01T12:00:00.000Z' }),
      ],
      'c',
    )
    const next = conversationsReducer(state, { type: 'delete', id: 'c', replacement })
    expect(next.conversations.map((c) => c.id)).toEqual(['a', 'b'])
    expect(next.activeConversationId).toBe('b')
  })

  it('mantém a ativa ao excluir outra conversa', () => {
    const state = makeState([makeConversation({ id: 'a' }), makeConversation({ id: 'b' })], 'a')
    expect(conversationsReducer(state, { type: 'delete', id: 'b', replacement }).activeConversationId).toBe('a')
  })

  it('cria uma conversa vazia ao excluir a última', () => {
    const state = makeState([makeConversation({ id: 'a', messages: [user('m1')] })])
    const next = conversationsReducer(state, { type: 'delete', id: 'a', replacement })
    expect(next.conversations).toEqual([replacement])
    expect(next.activeConversationId).toBe('repo')
  })

  it('remove a conversa da lista de pendentes', () => {
    const state = makeState(
      [makeConversation({ id: 'a' }), makeConversation({ id: 'b' })],
      'a',
      { b: true },
    )
    expect(conversationsReducer(state, { type: 'delete', id: 'b', replacement }).pending).toEqual({})
  })

  it('ignora id inexistente', () => {
    const state = makeState([makeConversation({ id: 'a' })])
    expect(conversationsReducer(state, { type: 'delete', id: 'x', replacement })).toBe(state)
  })
})

describe('sendStarted', () => {
  it('adiciona a pergunta, marca pendente e define o título automático na primeira mensagem', () => {
    const state = makeState([makeConversation({ id: 'a' })])
    const next = conversationsReducer(state, {
      type: 'sendStarted',
      conversationId: 'a',
      message: user('m1', 'Qual a garantia padrão dos tratores?'),
      now: NOW,
    })
    expect(next.conversations[0]).toMatchObject({
      title: 'Qual a garantia padrão dos tratores?',
      updatedAt: NOW,
    })
    expect(next.conversations[0]!.messages).toHaveLength(1)
    expect(next.pending).toEqual({ a: true })
  })

  it('não troca o título de uma conversa renomeada nem depois da primeira mensagem', () => {
    const renamed = makeState([makeConversation({ id: 'a', title: 'Meu título', titleIsCustom: true })])
    const first = conversationsReducer(renamed, {
      type: 'sendStarted',
      conversationId: 'a',
      message: user('m1'),
      now: NOW,
    })
    expect(first.conversations[0]!.title).toBe('Meu título')

    const withHistory = makeState([
      makeConversation({ id: 'a', title: 'Primeiro assunto', messages: [user('m0'), answer('m00')] }),
    ])
    const second = conversationsReducer(withHistory, {
      type: 'sendStarted',
      conversationId: 'a',
      message: user('m1', 'Outra pergunta'),
      now: NOW,
    })
    expect(second.conversations[0]!.title).toBe('Primeiro assunto')
  })

  it('ignora o segundo envio enquanto a conversa está pendente (idempotência)', () => {
    const state = makeState([makeConversation({ id: 'a' })])
    const once = conversationsReducer(state, {
      type: 'sendStarted',
      conversationId: 'a',
      message: user('m1'),
      now: NOW,
    })
    const twice = conversationsReducer(once, {
      type: 'sendStarted',
      conversationId: 'a',
      message: user('m2'),
      now: NOW,
    })
    expect(twice).toBe(once)
  })

  it('ignora conversa inexistente e mensagem que não é do usuário', () => {
    const state = makeState([makeConversation({ id: 'a' })])
    expect(
      conversationsReducer(state, { type: 'sendStarted', conversationId: 'x', message: user('m1'), now: NOW }),
    ).toBe(state)
    expect(
      conversationsReducer(state, { type: 'sendStarted', conversationId: 'a', message: answer('m1'), now: NOW }),
    ).toBe(state)
  })
})

describe('answerReceived e answerFailed', () => {
  const pendingState = makeState([makeConversation({ id: 'a', messages: [user('m1')] })], 'a', { a: true })

  it('anexa a resposta com fontes sem repetição e libera a conversa', () => {
    const next = conversationsReducer(pendingState, {
      type: 'answerReceived',
      conversationId: 'a',
      message: answer('m2', {
        sources: [
          { file: 'a.md', title: 'A' },
          { file: 'a.md', title: 'A' },
          { file: 'b.md', title: 'B' },
        ],
        contextReset: true,
      }),
      now: NOW,
    })
    const stored = next.conversations[0]!.messages.at(-1)!
    expect(stored.sources.map((s) => s.file)).toEqual(['a.md', 'b.md'])
    expect(stored.contextReset).toBe(true)
    expect(next.pending).toEqual({})
  })

  it('anexa a bolha de erro e libera a conversa', () => {
    const next = conversationsReducer(pendingState, {
      type: 'answerFailed',
      conversationId: 'a',
      message: errorBubble('m2'),
      now: NOW,
    })
    expect(next.conversations[0]!.messages.at(-1)).toMatchObject({ isError: true, errorKind: 'NETWORK' })
    expect(next.pending).toEqual({})
  })

  it('descarta a resposta de uma conversa excluída (BR-ENV-11)', () => {
    const next = conversationsReducer(pendingState, {
      type: 'answerReceived',
      conversationId: 'removida',
      message: answer('m2'),
      now: NOW,
    })
    expect(next).toBe(pendingState)
  })

  it('ignora respostas de uma conversa que não está pendente', () => {
    const idle = makeState([makeConversation({ id: 'a', messages: [user('m1')] })])
    const next = conversationsReducer(idle, {
      type: 'answerReceived',
      conversationId: 'a',
      message: answer('m2'),
      now: NOW,
    })
    expect(next).toBe(idle)
  })

  it('não grava uma resposta marcada como erro em answerReceived', () => {
    const next = conversationsReducer(pendingState, {
      type: 'answerReceived',
      conversationId: 'a',
      message: errorBubble('m2'),
      now: NOW,
    })
    expect(next.conversations[0]!.messages).toHaveLength(1)
    expect(next.pending).toEqual({})
  })
})

describe('retryStarted', () => {
  it('remove a bolha de erro e marca pendente (BR-ERR-04)', () => {
    const state = makeState([makeConversation({ id: 'a', messages: [user('m1'), errorBubble('m2')] })])
    expect(canRetryConversation(state.conversations[0]!)).toBe(true)
    const next = conversationsReducer(state, { type: 'retryStarted', conversationId: 'a', now: NOW })
    expect(next.conversations[0]!.messages.map((m) => m.id)).toEqual(['m1'])
    expect(next.pending).toEqual({ a: true })
  })

  it('só vale quando a última mensagem é uma bolha de erro depois de uma pergunta', () => {
    const noError = makeState([makeConversation({ id: 'a', messages: [user('m1'), answer('m2')] })])
    expect(conversationsReducer(noError, { type: 'retryStarted', conversationId: 'a', now: NOW })).toBe(noError)

    const onlyError = makeState([makeConversation({ id: 'a', messages: [errorBubble('m1')] })])
    expect(conversationsReducer(onlyError, { type: 'retryStarted', conversationId: 'a', now: NOW })).toBe(onlyError)
  })
})

describe('setStorageWarning', () => {
  it('liga e desliga o aviso e devolve o mesmo estado quando nada muda', () => {
    const state = makeState([makeConversation({ id: 'a' })])
    const on = conversationsReducer(state, { type: 'setStorageWarning', value: true })
    expect(on.storageWarning).toBe(true)
    expect(conversationsReducer(on, { type: 'setStorageWarning', value: true })).toBe(on)
  })
})

describe('createInitialState', () => {
  const fresh = () => createConversation('nova', 'sessao-nova', NOW)
  let counter = 0
  const newId = () => `id-${++counter}`

  it('cria uma conversa vazia quando não há dados (BR-CNV-10)', () => {
    const state = createInitialState(null, fresh, NOW, newId)
    expect(state.conversations).toHaveLength(1)
    expect(state.conversations[0]).toMatchObject({ id: 'nova', title: DEFAULT_TITLE, messages: [] })
    expect(state.activeConversationId).toBe('nova')
    expect(state.pending).toEqual({})
    expect(state.storageWarning).toBe(false)
  })

  it('restaura as conversas e a ativa', () => {
    const persisted = {
      version: 1,
      activeConversationId: 'b',
      conversations: [
        makeConversation({ id: 'a', messages: [user('m1'), answer('m2')] }),
        makeConversation({ id: 'b', messages: [user('m3'), answer('m4')] }),
      ],
    }
    const state = createInitialState(persisted, fresh, NOW, newId)
    expect(state.conversations).toHaveLength(2)
    expect(state.activeConversationId).toBe('b')
  })

  it('acrescenta a bolha NO_RESPONSE em conversa que termina em pergunta (BR-ERR-06)', () => {
    const persisted = {
      version: 1,
      activeConversationId: 'a',
      conversations: [makeConversation({ id: 'a', messages: [user('m1')] })],
    }
    const state = createInitialState(persisted, fresh, NOW, newId)
    const last = state.conversations[0]!.messages.at(-1)!
    expect(last).toMatchObject({ role: 'assistant', isError: true, errorKind: 'NO_RESPONSE' })
    expect(state.conversations[0]!.updatedAt).toBe('2026-06-01T12:00:00.000Z')
  })

  it('seleciona a mais recente quando a ativa não existe', () => {
    const persisted = {
      version: 1,
      activeConversationId: 'inexistente',
      conversations: [
        makeConversation({ id: 'a', updatedAt: '2026-06-01T10:00:00.000Z' }),
        makeConversation({ id: 'b', updatedAt: '2026-06-01T11:00:00.000Z' }),
      ],
    }
    expect(createInitialState(persisted, fresh, NOW, newId).activeConversationId).toBe('b')
  })
})
