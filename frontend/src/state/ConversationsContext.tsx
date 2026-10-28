import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react'
import { STORAGE_VERSION } from '../constants'
import { loadConversations, saveConversations } from '../storage/conversationStorage'
import type { Conversation, ConversationsState } from '../types'
import { sortConversations } from './conversationRules'
import {
  conversationsReducer,
  createConversation,
  createInitialState,
  type ConversationsAction,
} from './conversationsReducer'
import { defaultGenerateId, defaultNow } from './ids'

export interface ConversationsServices {
  generateId: () => string
  now: () => string
}

interface ConversationsContextValue {
  state: ConversationsState
  dispatch: Dispatch<ConversationsAction>
  activeConversation: Conversation
  sortedConversations: Conversation[]
  isPending: (conversationId: string) => boolean
  services: ConversationsServices
  /** Conversa vazia nova (id, sessionId e hora gerados aqui, fora do reducer). */
  newConversation: () => Conversation
  /** Reserva a conversa para uma chamada à API. Devolve false se já há uma em andamento. */
  beginRequest: (conversationId: string) => boolean
  endRequest: (conversationId: string) => void
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null)

interface ConversationsProviderProps {
  children: ReactNode
  /** Armazenamento. Padrão: localStorage. `null` desliga a persistência. */
  storage?: Storage | null
  services?: Partial<ConversationsServices>
}

export function ConversationsProvider({ children, storage, services }: ConversationsProviderProps) {
  const generateId = services?.generateId ?? defaultGenerateId
  const now = services?.now ?? defaultNow
  const resolved = useMemo<ConversationsServices>(() => ({ generateId, now }), [generateId, now])

  const newConversation = useCallback(
    () => createConversation(resolved.generateId(), resolved.generateId(), resolved.now()),
    [resolved],
  )

  const [state, dispatch] = useReducer(conversationsReducer, undefined, () =>
    createInitialState(loadConversations(storage), newConversation, resolved.now(), resolved.generateId),
  )

  // BR-PER-02: grava só quando as conversas ou a conversa ativa mudam.
  useEffect(() => {
    const saved = saveConversations(
      {
        version: STORAGE_VERSION,
        activeConversationId: state.activeConversationId,
        conversations: state.conversations,
      },
      storage,
    )
    if (!saved) console.warn('Falha ao gravar as conversas no armazenamento do navegador.')
    dispatch({ type: 'setStorageWarning', value: !saved })
  }, [state.conversations, state.activeConversationId, storage])

  const inFlight = useRef(new Set<string>())
  const beginRequest = useCallback((conversationId: string) => {
    if (inFlight.current.has(conversationId)) return false
    inFlight.current.add(conversationId)
    return true
  }, [])
  const endRequest = useCallback((conversationId: string) => {
    inFlight.current.delete(conversationId)
  }, [])

  const value = useMemo<ConversationsContextValue>(() => {
    const activeConversation =
      state.conversations.find((c) => c.id === state.activeConversationId) ?? state.conversations[0]!
    return {
      state,
      dispatch,
      activeConversation,
      sortedConversations: sortConversations(state.conversations),
      isPending: (conversationId: string) => state.pending[conversationId] === true,
      services: resolved,
      newConversation,
      beginRequest,
      endRequest,
    }
  }, [state, resolved, newConversation, beginRequest, endRequest])

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>
}

export function useConversations(): ConversationsContextValue {
  const value = useContext(ConversationsContext)
  if (!value) throw new Error('useConversations deve ser usado dentro de ConversationsProvider.')
  return value
}
