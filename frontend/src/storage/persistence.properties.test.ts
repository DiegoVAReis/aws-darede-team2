import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { arbPersistedState } from '../test/arbitraries'
import { stateViolations } from '../test/invariants'
import { parseState, serializeState } from './persistence'

describe('serializeState e parseState (propriedades)', () => {
  it('round-trip: ler o que foi gravado devolve o mesmo estado (PBT-02)', () => {
    fc.assert(
      fc.property(arbPersistedState, (state) => {
        expect(parseState(serializeState(state))).toEqual(state)
      }),
    )
  })

  it('texto arbitrário nunca lança exceção e o resultado é nulo ou válido', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.json(), fc.jsonValue().map((v) => JSON.stringify(v))), (raw) => {
        const result = parseState(raw)
        if (result === null) return
        expect(
          stateViolations({
            conversations: result.conversations,
            activeConversationId: result.activeConversationId,
            pending: {},
            storageWarning: false,
          }),
        ).toEqual([])
      }),
    )
  })

  it('estado válido corrompido em um ponto qualquer continua sem lançar exceção e sem violar invariantes', () => {
    fc.assert(
      fc.property(
        arbPersistedState,
        fc.nat(5000),
        fc.string({ maxLength: 5 }),
        fc.nat(20),
        (state, position, insertion, removal) => {
          const text = serializeState(state)
          const at = position % (text.length + 1)
          const corrupted = text.slice(0, at) + insertion + text.slice(at + removal)
          const result = parseState(corrupted)
          if (result === null) return
          expect(
            stateViolations({
              conversations: result.conversations,
              activeConversationId: result.activeConversationId,
              pending: {},
              storageWarning: false,
            }),
          ).toEqual([])
        },
      ),
    )
  })
})
