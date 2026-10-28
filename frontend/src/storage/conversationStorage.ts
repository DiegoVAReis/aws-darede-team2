import { STORAGE_KEY } from '../constants'
import type { PersistedState } from '../types'
import { parseState, serializeState } from './persistence'

/** O acesso ao localStorage pode lançar exceção (bloqueado, modo privado). */
function getDefaultStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Lê e valida o estado gravado. Devolve null se não houver dados aproveitáveis. */
export function loadConversations(storage: Storage | null = getDefaultStorage()): PersistedState | null {
  if (!storage) return null
  try {
    return parseState(storage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

/** Grava o estado. Devolve false em falha (espaço esgotado ou armazenamento bloqueado). */
export function saveConversations(
  state: PersistedState,
  storage: Storage | null = getDefaultStorage(),
): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, serializeState(state))
    return true
  } catch {
    return false
  }
}
