import { MAX_TITLE_LENGTH, SESSION_ID_PATTERN } from '../constants'
import { codePointLength } from '../state/conversationRules'
import type { Conversation, ConversationsState, Message } from '../types'

function messageViolations(message: Message): string[] {
  const violations: string[] = []
  if (message.role === 'user') {
    if (
      message.sources.length > 0 ||
      message.isError !== undefined ||
      message.errorKind !== undefined ||
      message.contextReset !== undefined
    ) {
      violations.push('INV-08: mensagem do usuário com campos de assistente')
    }
    return violations
  }
  if (message.isError === true) {
    if (message.errorKind === undefined || message.sources.length > 0 || message.contextReset) {
      violations.push('INV-08: bolha de erro inválida')
    }
    return violations
  }
  if (message.isError !== undefined || message.errorKind !== undefined) {
    violations.push('INV-08: resposta com campos de erro')
  }
  const files = message.sources.map((s) => s.file)
  if (new Set(files).size !== files.length) violations.push('INV-08: fontes repetidas')
  return violations
}

function conversationViolations(conversation: Conversation): string[] {
  const violations: string[] = []
  const { title } = conversation
  if (title === '' || title !== title.trim() || codePointLength(title) > MAX_TITLE_LENGTH) {
    violations.push(`INV-06: título inválido "${title}"`)
  }
  const ids = conversation.messages.map((m) => m.id)
  if (new Set(ids).size !== ids.length) violations.push('INV-07: ids de mensagem repetidos')
  for (const message of conversation.messages) violations.push(...messageViolations(message))
  return violations
}

/** Confere INV-01 a INV-08. Devolve a lista de violações (vazia = estado válido). */
export function stateViolations(state: ConversationsState): string[] {
  const violations: string[] = []
  const ids = state.conversations.map((c) => c.id)
  if (new Set(ids).size !== ids.length) violations.push('INV-01: ids de conversa repetidos')

  const sessionIds = state.conversations.map((c) => c.sessionId)
  if (new Set(sessionIds).size !== sessionIds.length) violations.push('INV-02: sessionId repetido')
  if (sessionIds.some((s) => !SESSION_ID_PATTERN.test(s))) {
    violations.push('INV-02: sessionId fora do padrão')
  }

  if (state.conversations.length === 0) violations.push('INV-03: sem conversas')
  if (!ids.includes(state.activeConversationId)) violations.push('INV-04: conversa ativa inexistente')
  for (const key of Object.keys(state.pending)) {
    if (!ids.includes(key)) violations.push(`INV-05: pending para conversa inexistente ${key}`)
  }
  for (const conversation of state.conversations) violations.push(...conversationViolations(conversation))
  return violations
}

export function emptyConversationCount(state: ConversationsState): number {
  return state.conversations.filter((c) => c.messages.length === 0).length
}
