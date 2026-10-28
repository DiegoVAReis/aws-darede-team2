import { AUTO_TITLE_LENGTH, DEFAULT_TITLE, MAX_TITLE_LENGTH } from '../constants'
import type { Conversation, SourceRef } from '../types'

/** Conta pontos de código Unicode (igual ao `len` do Python no Backend). */
export function codePointLength(text: string): number {
  return Array.from(text).length
}

function truncateCodePoints(text: string, max: number): string {
  const points = Array.from(text)
  return points.length <= max ? text : points.slice(0, max).join('')
}

/** BR-CNV-02: título automático a partir da primeira pergunta. */
export function deriveTitle(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized === '') return DEFAULT_TITLE
  const points = Array.from(normalized)
  if (points.length <= AUTO_TITLE_LENGTH) return normalized
  return `${points.slice(0, AUTO_TITLE_LENGTH).join('').trimEnd()}…`
}

/** BR-CNV-06: devolve o título aparado e limitado a 60 caracteres, ou null se vazio. */
export function normalizeRename(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  return truncateCodePoints(trimmed, MAX_TITLE_LENGTH).trimEnd()
}

/** Mantém a primeira ocorrência de cada arquivo, preservando a ordem. */
export function dedupeSources(sources: readonly SourceRef[]): SourceRef[] {
  const seen = new Set<string>()
  const result: SourceRef[] = []
  for (const source of sources) {
    if (seen.has(source.file)) continue
    seen.add(source.file)
    result.push(source)
  }
  return result
}

/** BR-CNV-09: da conversa atualizada mais recentemente para a mais antiga. Não altera a entrada. */
export function sortConversations(list: readonly Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    if (a.updatedAt < b.updatedAt) return 1
    if (a.updatedAt > b.updatedAt) return -1
    return 0
  })
}

export function isEmptyConversation(conversation: Conversation): boolean {
  return conversation.messages.length === 0
}
