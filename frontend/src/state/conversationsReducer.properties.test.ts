import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  arbActionSpec,
  arbConversationsState,
  arbNonBlankText,
  arbPersistedState,
  buildMessage,
  concretize,
} from '../test/arbitraries'
import { emptyConversationCount, stateViolations } from '../test/invariants'
import {
  conversationsReducer,
  createConversation,
  createInitialState,
} from './conversationsReducer'

const arbSequence = fc.array(arbActionSpec, { minLength: 1, maxLength: 25 })

describe('conversationsReducer (propriedades)', () => {
  it('qualquer sequência de ações mantém INV-01 a INV-08', () => {
    fc.assert(
      fc.property(arbConversationsState(), arbSequence, (initial, specs) => {
        expect(stateViolations(initial)).toEqual([])
        let state = initial
        specs.forEach((spec, step) => {
          state = conversationsReducer(state, concretize(spec, state, step))
          expect(stateViolations(state)).toEqual([])
        })
      }),
    )
  })

  it('id e sessionId das conversas que continuam existindo nunca mudam (INV-02)', () => {
    fc.assert(
      fc.property(arbConversationsState(), arbSequence, (initial, specs) => {
        const sessions = new Map(initial.conversations.map((c) => [c.id, c.sessionId]))
        let state = initial
        specs.forEach((spec, step) => {
          state = conversationsReducer(state, concretize(spec, state, step))
          for (const conversation of state.conversations) {
            const known = sessions.get(conversation.id)
            if (known === undefined) sessions.set(conversation.id, conversation.sessionId)
            else expect(conversation.sessionId).toBe(known)
          }
        })
      }),
    )
  })

  it('a partir de no máximo uma conversa vazia, nunca há duas (INV-09)', () => {
    fc.assert(
      fc.property(arbConversationsState({ atMostOneEmpty: true }), arbSequence, (initial, specs) => {
        expect(emptyConversationCount(initial)).toBeLessThanOrEqual(1)
        let state = initial
        specs.forEach((spec, step) => {
          state = conversationsReducer(state, concretize(spec, state, step))
          expect(emptyConversationCount(state)).toBeLessThanOrEqual(1)
        })
      }),
    )
  })

  it('excluir qualquer conversa deixa pelo menos uma conversa e uma ativa válida', () => {
    fc.assert(
      fc.property(arbConversationsState(), fc.nat(10), (state, index) => {
        const target = state.conversations[index % state.conversations.length]!
        const next = conversationsReducer(state, {
          type: 'delete',
          id: target.id,
          replacement: createConversation('reposicao', 'sessao-reposicao', '2026-06-01T00:00:00.000Z'),
        })
        expect(next.conversations.length).toBeGreaterThanOrEqual(1)
        expect(next.conversations.some((c) => c.id === next.activeConversationId)).toBe(true)
        expect(stateViolations(next)).toEqual([])
      }),
    )
  })

  it('respostas e erros para conversa inexistente não mudam o estado', () => {
    fc.assert(
      fc.property(arbConversationsState(), arbNonBlankText, (state, content) => {
        const now = '2026-06-01T00:00:00.000Z'
        const answered = conversationsReducer(state, {
          type: 'answerReceived',
          conversationId: 'inexistente',
          message: buildMessage({ kind: 'assistant', content, sources: [], contextReset: false }, 'x', now),
          now,
        })
        const failed = conversationsReducer(state, {
          type: 'answerFailed',
          conversationId: 'inexistente',
          message: buildMessage({ kind: 'error', errorKind: 'NETWORK' }, 'y', now),
          now,
        })
        expect(answered).toBe(state)
        expect(failed).toBe(state)
      }),
    )
  })

  it('enviar duas vezes sem resposta no meio adiciona só uma mensagem (idempotência)', () => {
    fc.assert(
      fc.property(
        arbConversationsState({ withPending: false }),
        fc.nat(10),
        arbNonBlankText,
        arbNonBlankText,
        (state, index, first, second) => {
          const target = state.conversations[index % state.conversations.length]!
          const now = '2026-06-01T00:00:00.000Z'
          const once = conversationsReducer(state, {
            type: 'sendStarted',
            conversationId: target.id,
            message: buildMessage({ kind: 'user', content: first }, 'novo-1', now),
            now,
          })
          const twice = conversationsReducer(once, {
            type: 'sendStarted',
            conversationId: target.id,
            message: buildMessage({ kind: 'user', content: second }, 'novo-2', now),
            now,
          })
          expect(twice).toBe(once)
          const before = target.messages.length
          expect(once.conversations.find((c) => c.id === target.id)!.messages).toHaveLength(before + 1)
        },
      ),
    )
  })
})

describe('createInitialState (propriedades)', () => {
  it('para qualquer estado persistido ou nulo, o resultado satisfaz INV-01 a INV-08', () => {
    let counter = 0
    fc.assert(
      fc.property(fc.option(arbPersistedState, { nil: null }), (persisted) => {
        const state = createInitialState(
          persisted,
          () => createConversation('nova', 'sessao-nova', '2026-06-01T00:00:00.000Z'),
          '2026-06-02T00:00:00.000Z',
          () => `gerado-${++counter}`,
        )
        expect(stateViolations(state)).toEqual([])
        expect(state.pending).toEqual({})
        // Nenhuma conversa termina em pergunta sem resposta (BR-ERR-06).
        for (const conversation of state.conversations) {
          expect(conversation.messages.at(-1)?.role).not.toBe('user')
        }
      }),
    )
  })
})
