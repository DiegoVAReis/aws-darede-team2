import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, STORAGE_VERSION } from '../constants'
import { MemoryStorage, makeConversation } from '../test/helpers'
import type { PersistedState } from '../types'
import { loadConversations, saveConversations } from './conversationStorage'

const state: PersistedState = {
  version: STORAGE_VERSION,
  activeConversationId: 'a',
  conversations: [makeConversation({ id: 'a' })],
}

describe('saveConversations e loadConversations', () => {
  it('grava e lê de volta', () => {
    const storage = new MemoryStorage()
    expect(saveConversations(state, storage)).toBe(true)
    expect(loadConversations(storage)).toEqual(state)
  })

  it('usa a chave do domínio', () => {
    const storage = new MemoryStorage()
    saveConversations(state, storage)
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('devolve false quando a gravação falha (cota esgotada)', () => {
    const storage = new MemoryStorage()
    storage.failOnSet = true
    expect(saveConversations(state, storage)).toBe(false)
  })

  it('devolve null quando a leitura falha ou o texto está corrompido', () => {
    const blocked = new MemoryStorage()
    blocked.failOnGet = true
    expect(loadConversations(blocked)).toBeNull()

    const corrupted = new MemoryStorage()
    corrupted.setItem(STORAGE_KEY, '{{{')
    expect(loadConversations(corrupted)).toBeNull()
  })

  it('trata armazenamento indisponível (null) sem lançar exceção', () => {
    expect(loadConversations(null)).toBeNull()
    expect(saveConversations(state, null)).toBe(false)
  })

  it('usa o localStorage do navegador por padrão', () => {
    expect(saveConversations(state)).toBe(true)
    expect(loadConversations()).toEqual(state)
  })
})
