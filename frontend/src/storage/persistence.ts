import { MAX_TITLE_LENGTH, SESSION_ID_PATTERN, STORAGE_VERSION } from '../constants'
import { codePointLength, dedupeSources, sortConversations } from '../state/conversationRules'
import type { Conversation, ErrorKind, Message, PersistedState, SourceRef } from '../types'

const ERROR_KIND_VALUES: readonly string[] = [
  'VALIDATION_ERROR',
  'KB_NOT_INDEXED',
  'UPSTREAM_ERROR',
  'INTERNAL_ERROR',
  'NETWORK',
  'TIMEOUT',
  'UNEXPECTED_RESPONSE',
  'NO_RESPONSE',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function parseSource(value: unknown): SourceRef | null {
  if (!isRecord(value)) return null
  if (!isNonEmptyString(value.file) || typeof value.title !== 'string') return null
  return { file: value.file, title: value.title }
}

/** Valida uma mensagem e impõe INV-08. Devolve null se for inválida. */
function parseMessage(value: unknown): Message | null {
  if (!isRecord(value)) return null
  const { id, role, content, sources, createdAt, isError, errorKind, contextReset } = value
  if (!isNonEmptyString(id) || !isNonEmptyString(createdAt) || typeof content !== 'string') return null
  if (role !== 'user' && role !== 'assistant') return null
  if (!Array.isArray(sources)) return null
  const parsedSources: SourceRef[] = []
  for (const raw of sources) {
    const source = parseSource(raw)
    if (!source) return null
    parsedSources.push(source)
  }
  if (isError !== undefined && typeof isError !== 'boolean') return null
  if (contextReset !== undefined && typeof contextReset !== 'boolean') return null
  if (errorKind !== undefined && !(typeof errorKind === 'string' && ERROR_KIND_VALUES.includes(errorKind))) {
    return null
  }

  const message: Message = {
    id,
    role,
    content,
    sources: dedupeSources(parsedSources),
    createdAt,
  }
  if (isError === true) {
    if (role !== 'assistant' || errorKind === undefined || message.sources.length > 0) return null
    if (contextReset === true) return null
    message.isError = true
    message.errorKind = errorKind as ErrorKind
    return message
  }
  if (isError === false || errorKind !== undefined) return null
  if (role === 'user') {
    if (message.sources.length > 0 || contextReset !== undefined) return null
    return message
  }
  if (contextReset === true) message.contextReset = true
  else if (contextReset === false) return null
  return message
}

function parseConversation(value: unknown): Conversation | null {
  if (!isRecord(value)) return null
  const { id, sessionId, title, titleIsCustom, messages, createdAt, updatedAt } = value
  if (!isNonEmptyString(id) || !isNonEmptyString(createdAt) || !isNonEmptyString(updatedAt)) return null
  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) return null
  if (typeof title !== 'string' || title === '' || title !== title.trim()) return null
  if (codePointLength(title) > MAX_TITLE_LENGTH) return null
  if (typeof titleIsCustom !== 'boolean') return null
  if (!Array.isArray(messages)) return null

  const parsedMessages: Message[] = []
  const messageIds = new Set<string>()
  for (const raw of messages) {
    const message = parseMessage(raw)
    if (!message || messageIds.has(message.id)) return null
    messageIds.add(message.id)
    parsedMessages.push(message)
  }
  return { id, sessionId, title, titleIsCustom, messages: parsedMessages, createdAt, updatedAt }
}

/** BR-PER-01: JSON do formato persistido. */
export function serializeState(state: PersistedState): string {
  return JSON.stringify({
    version: state.version,
    activeConversationId: state.activeConversationId,
    conversations: state.conversations,
  })
}

/**
 * BR-PER-03 a BR-PER-05: valida o texto gravado. Nunca lança exceção.
 * Devolve null quando não há nada aproveitável (o app inicia vazio).
 */
export function parseState(raw: string | null): PersistedState | null {
  if (raw === null) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(data) || data.version !== STORAGE_VERSION || !Array.isArray(data.conversations)) {
    return null
  }

  const conversations: Conversation[] = []
  const ids = new Set<string>()
  const sessionIds = new Set<string>()
  for (const entry of data.conversations) {
    const conversation = parseConversation(entry)
    if (!conversation) continue
    if (ids.has(conversation.id) || sessionIds.has(conversation.sessionId)) continue
    ids.add(conversation.id)
    sessionIds.add(conversation.sessionId)
    conversations.push(conversation)
  }
  const [mostRecent] = sortConversations(conversations)
  if (!mostRecent) return null

  const active = data.activeConversationId
  const activeConversationId =
    typeof active === 'string' && ids.has(active) ? active : mostRecent.id
  return { version: STORAGE_VERSION, activeConversationId, conversations }
}
