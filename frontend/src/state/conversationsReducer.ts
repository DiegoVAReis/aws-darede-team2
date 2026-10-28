import { DEFAULT_TITLE } from '../constants'
import { errorText } from '../api/errorMessages'
import type { Conversation, ConversationsState, Message, PersistedState } from '../types'
import {
  dedupeSources,
  deriveTitle,
  isEmptyConversation,
  normalizeRename,
  sortConversations,
} from './conversationRules'

export type ConversationsAction =
  | { type: 'create'; fresh: Conversation }
  | { type: 'select'; id: string }
  | { type: 'rename'; id: string; title: string; now: string }
  | { type: 'delete'; id: string; replacement: Conversation }
  | { type: 'sendStarted'; conversationId: string; message: Message; now: string }
  | { type: 'retryStarted'; conversationId: string; now: string }
  | { type: 'answerReceived'; conversationId: string; message: Message; now: string }
  | { type: 'answerFailed'; conversationId: string; message: Message; now: string }
  | { type: 'setStorageWarning'; value: boolean }

/** BR-CNV-01: conversa vazia nova. `id`, `sessionId` e `now` vêm de fora para manter a pureza. */
export function createConversation(id: string, sessionId: string, now: string): Conversation {
  return {
    id,
    sessionId,
    title: DEFAULT_TITLE,
    titleIsCustom: false,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

function findConversation(state: ConversationsState, id: string): Conversation | undefined {
  return state.conversations.find((c) => c.id === id)
}

function replaceConversation(
  state: ConversationsState,
  updated: Conversation,
): Conversation[] {
  return state.conversations.map((c) => (c.id === updated.id ? updated : c))
}

function withoutPending(pending: Record<string, true>, id: string): Record<string, true> {
  const { [id]: _removed, ...rest } = pending
  return rest
}

function collides(state: ConversationsState, candidate: Conversation): boolean {
  return state.conversations.some(
    (c) => c.id === candidate.id || c.sessionId === candidate.sessionId,
  )
}

function hasMessage(conversation: Conversation, messageId: string): boolean {
  return conversation.messages.some((m) => m.id === messageId)
}

/** Última mensagem é uma bolha de erro precedida por uma pergunta do usuário (BR-ERR-03). */
export function canRetryConversation(conversation: Conversation): boolean {
  const last = conversation.messages.at(-1)
  const previous = conversation.messages.at(-2)
  return last?.isError === true && previous?.role === 'user'
}

export function conversationsReducer(
  state: ConversationsState,
  action: ConversationsAction,
): ConversationsState {
  switch (action.type) {
    case 'create': {
      const empties = state.conversations.filter(isEmptyConversation)
      const [reusable] = sortConversations(empties)
      if (reusable) {
        return reusable.id === state.activeConversationId
          ? state
          : { ...state, activeConversationId: reusable.id }
      }
      if (collides(state, action.fresh)) return state
      return {
        ...state,
        conversations: [...state.conversations, action.fresh],
        activeConversationId: action.fresh.id,
      }
    }

    case 'select': {
      if (!findConversation(state, action.id) || action.id === state.activeConversationId) {
        return state
      }
      return { ...state, activeConversationId: action.id }
    }

    case 'rename': {
      const conversation = findConversation(state, action.id)
      const title = normalizeRename(action.title)
      if (!conversation || title === null) return state
      return {
        ...state,
        conversations: replaceConversation(state, {
          ...conversation,
          title,
          titleIsCustom: true,
          updatedAt: action.now,
        }),
      }
    }

    case 'delete': {
      if (!findConversation(state, action.id)) return state
      const remaining = state.conversations.filter((c) => c.id !== action.id)
      const pending = withoutPending(state.pending, action.id)
      if (remaining.length === 0) {
        return {
          ...state,
          conversations: [action.replacement],
          activeConversationId: action.replacement.id,
          pending,
        }
      }
      const [mostRecent] = sortConversations(remaining)
      const activeConversationId =
        action.id === state.activeConversationId && mostRecent
          ? mostRecent.id
          : state.activeConversationId
      return { ...state, conversations: remaining, activeConversationId, pending }
    }

    case 'sendStarted': {
      const conversation = findConversation(state, action.conversationId)
      if (!conversation || state.pending[conversation.id]) return state
      if (action.message.role !== 'user' || hasMessage(conversation, action.message.id)) return state
      const isFirstMessage = isEmptyConversation(conversation)
      const updated: Conversation = {
        ...conversation,
        messages: [...conversation.messages, action.message],
        updatedAt: action.now,
        title:
          isFirstMessage && !conversation.titleIsCustom
            ? deriveTitle(action.message.content)
            : conversation.title,
      }
      return {
        ...state,
        conversations: replaceConversation(state, updated),
        pending: { ...state.pending, [conversation.id]: true },
      }
    }

    case 'retryStarted': {
      const conversation = findConversation(state, action.conversationId)
      if (!conversation || state.pending[conversation.id] || !canRetryConversation(conversation)) {
        return state
      }
      const updated: Conversation = {
        ...conversation,
        messages: conversation.messages.slice(0, -1),
        updatedAt: action.now,
      }
      return {
        ...state,
        conversations: replaceConversation(state, updated),
        pending: { ...state.pending, [conversation.id]: true },
      }
    }

    case 'answerReceived':
    case 'answerFailed': {
      const conversation = findConversation(state, action.conversationId)
      if (!conversation || !state.pending[conversation.id]) return state
      const { message } = action
      const valid =
        message.role === 'assistant' &&
        (action.type === 'answerFailed' ? message.isError === true : message.isError !== true)
      const pending = withoutPending(state.pending, conversation.id)
      if (!valid || hasMessage(conversation, message.id)) return { ...state, pending }
      const stored: Message =
        action.type === 'answerReceived'
          ? { ...message, sources: dedupeSources(message.sources) }
          : { ...message, sources: [] }
      return {
        ...state,
        conversations: replaceConversation(state, {
          ...conversation,
          messages: [...conversation.messages, stored],
          updatedAt: action.now,
        }),
        pending,
      }
    }

    case 'setStorageWarning':
      return state.storageWarning === action.value ? state : { ...state, storageWarning: action.value }
  }
}

/**
 * BR-CNV-10, BR-PER-05 e BR-ERR-06: monta o estado inicial a partir do que foi lido do armazenamento.
 * `fresh` e `newId` vêm de fora para manter a pureza.
 */
export function createInitialState(
  persisted: PersistedState | null,
  fresh: () => Conversation,
  now: string,
  newId: () => string,
): ConversationsState {
  const conversations = (persisted?.conversations ?? []).map((conversation) => {
    const last = conversation.messages.at(-1)
    if (last?.role !== 'user') return conversation
    const noResponse: Message = {
      id: newId(),
      role: 'assistant',
      content: errorText('NO_RESPONSE'),
      sources: [],
      createdAt: now,
      isError: true,
      errorKind: 'NO_RESPONSE',
    }
    return { ...conversation, messages: [...conversation.messages, noResponse] }
  })

  if (conversations.length === 0) {
    const first = fresh()
    return { conversations: [first], activeConversationId: first.id, pending: {}, storageWarning: false }
  }

  const persistedActive = persisted?.activeConversationId
  const activeConversationId =
    persistedActive !== undefined && conversations.some((c) => c.id === persistedActive)
      ? persistedActive
      : (sortConversations(conversations)[0]?.id ?? conversations[0]!.id)
  return { conversations, activeConversationId, pending: {}, storageWarning: false }
}
