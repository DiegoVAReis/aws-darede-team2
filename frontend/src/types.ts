/** Fonte de uma resposta. Espelha o contrato HTTP v1 do Backend. */
export interface SourceRef {
  file: string
  title: string
}

/** Tipos de falha de uma pergunta. Cada um tem um texto fixo em português. */
export type ErrorKind =
  | 'VALIDATION_ERROR'
  | 'KB_NOT_INDEXED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNEXPECTED_RESPONSE'
  | 'NO_RESPONSE'

/** Falhas que o cliente da API pode lançar (NO_RESPONSE só nasce no carregamento). */
export type ApiErrorKind = Exclude<ErrorKind, 'NO_RESPONSE'>

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  sources: SourceRef[]
  createdAt: string
  isError?: boolean
  errorKind?: ErrorKind
  contextReset?: boolean
}

export interface Conversation {
  id: string
  sessionId: string
  title: string
  titleIsCustom: boolean
  messages: Message[]
  createdAt: string
  updatedAt: string
}

/** Estado em memória. `pending` e `storageWarning` nunca são persistidos. */
export interface ConversationsState {
  conversations: Conversation[]
  activeConversationId: string
  pending: Record<string, true>
  storageWarning: boolean
}

/** Formato gravado no localStorage. */
export interface PersistedState {
  version: number
  activeConversationId: string
  conversations: Conversation[]
}

/** Resposta de sucesso de POST /v1/ask (campos em snake_case, como o contrato). */
export interface AskResponse {
  answer: string
  sources: SourceRef[]
  session_id: string
  session_reset: boolean
}
