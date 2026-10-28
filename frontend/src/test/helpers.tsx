import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import App from '../App'
import { ConversationsProvider, type ConversationsServices } from '../state/ConversationsContext'
import type { Conversation, ConversationsState, Message } from '../types'

/** Armazenamento em memória que pode falhar de propósito. */
export class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>()
  failOnSet = false
  failOnGet = false

  get length(): number {
    return this.data.size
  }
  clear(): void {
    this.data.clear()
  }
  getItem(key: string): string | null {
    if (this.failOnGet) throw new DOMException('bloqueado', 'SecurityError')
    return this.data.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.data.delete(key)
  }
  setItem(key: string, value: string): void {
    if (this.failOnSet) throw new DOMException('cota excedida', 'QuotaExceededError')
    this.data.set(key, value)
  }
}

/** Ids sequenciais e relógio que avança 1 s por chamada: resultados previsíveis. */
export function createTestServices(prefix = 'id'): ConversationsServices {
  let counter = 0
  let tick = 0
  return {
    generateId: () => `${prefix}-${++counter}`,
    now: () => new Date(Date.UTC(2026, 5, 1, 12, 0, tick++)).toISOString(),
  }
}

export function makeMessage(overrides: Partial<Message> & Pick<Message, 'id' | 'role'>): Message {
  return {
    content: overrides.role === 'user' ? 'Pergunta' : 'Resposta',
    sources: [],
    createdAt: '2026-06-01T12:00:00.000Z',
    ...overrides,
  }
}

export function makeConversation(
  overrides: Partial<Conversation> & Pick<Conversation, 'id'>,
): Conversation {
  return {
    sessionId: `sessao-${overrides.id}`,
    title: 'Nova conversa',
    titleIsCustom: false,
    messages: [],
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    ...overrides,
  }
}

export function makeState(
  conversations: Conversation[],
  activeConversationId = conversations[0]!.id,
  pending: Record<string, true> = {},
): ConversationsState {
  return { conversations, activeConversationId, pending, storageWarning: false }
}

export function renderWithProvider(
  ui: ReactElement,
  options: { storage?: Storage | null; services?: ConversationsServices } = {},
): RenderResult {
  return render(
    <ConversationsProvider storage={options.storage} services={options.services ?? createTestServices()}>
      {ui}
    </ConversationsProvider>,
  )
}

export function renderApp(options: { storage?: Storage | null; services?: ConversationsServices } = {}) {
  const services = options.services ?? createTestServices()
  const storage = options.storage === undefined ? new MemoryStorage() : options.storage
  return { ...render(<App storage={storage} services={services} />), storage, services }
}
