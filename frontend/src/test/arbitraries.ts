import fc from 'fast-check'
import { ERROR_KINDS, errorText } from '../api/errorMessages'
import { DEFAULT_TITLE, STORAGE_VERSION } from '../constants'
import { dedupeSources, normalizeRename } from '../state/conversationRules'
import { createConversation, type ConversationsAction } from '../state/conversationsReducer'
import type {
  Conversation,
  ConversationsState,
  ErrorKind,
  Message,
  PersistedState,
  SourceRef,
} from '../types'

// PBT-07: geradores de domínio. Texto com acentos, emoji, espaços e quebras de linha.
const TEXT_CHARS = ['a', 'b', 'c', 'ç', 'ã', 'é', '😀', '0', '1', '?', '.', ' ', '\n', '\t']

export const arbText: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...TEXT_CHARS), { maxLength: 120 })
  .map((chars) => chars.join(''))

export const arbNonBlankText: fc.Arbitrary<string> = arbText.filter((text) => text.trim() !== '')

export const arbIso: fc.Arbitrary<string> = fc
  .date({
    min: new Date('2020-01-01T00:00:00Z'),
    max: new Date('2030-01-01T00:00:00Z'),
    noInvalidDate: true,
  })
  .map((date) => date.toISOString())

export const arbSource: fc.Arbitrary<SourceRef> = fc.record({
  file: fc.constantFrom('a.md', 'b.md', 'c.md', 'd.md'),
  title: arbText,
})

export const arbSourcesWithDuplicates: fc.Arbitrary<SourceRef[]> = fc.array(arbSource, { maxLength: 6 })

export const arbSources: fc.Arbitrary<SourceRef[]> = arbSourcesWithDuplicates.map(dedupeSources)

export const arbErrorKind: fc.Arbitrary<ErrorKind> = fc.constantFrom(...ERROR_KINDS)

export const arbTitle: fc.Arbitrary<string> = fc.oneof(
  arbNonBlankText.map((text) => normalizeRename(text) ?? DEFAULT_TITLE),
  fc.constant(DEFAULT_TITLE),
)

type MessageSpec =
  | { kind: 'user'; content: string }
  | { kind: 'assistant'; content: string; sources: SourceRef[]; contextReset: boolean }
  | { kind: 'error'; errorKind: ErrorKind }

const arbMessageSpec: fc.Arbitrary<MessageSpec> = fc.oneof(
  fc.record({ kind: fc.constant('user' as const), content: arbNonBlankText }),
  fc.record({
    kind: fc.constant('assistant' as const),
    content: arbNonBlankText,
    sources: arbSources,
    contextReset: fc.boolean(),
  }),
  fc.record({ kind: fc.constant('error' as const), errorKind: arbErrorKind }),
)

export function buildMessage(spec: MessageSpec, id: string, createdAt: string): Message {
  switch (spec.kind) {
    case 'user':
      return { id, role: 'user', content: spec.content, sources: [], createdAt }
    case 'assistant':
      return {
        id,
        role: 'assistant',
        content: spec.content,
        sources: spec.sources,
        createdAt,
        ...(spec.contextReset ? { contextReset: true } : {}),
      }
    case 'error':
      return {
        id,
        role: 'assistant',
        content: errorText(spec.errorKind),
        sources: [],
        createdAt,
        isError: true,
        errorKind: spec.errorKind,
      }
  }
}

interface ConversationBody {
  title: string
  titleIsCustom: boolean
  specs: MessageSpec[]
  createdAt: string
  updatedAt: string
}

const arbConversationBody: fc.Arbitrary<ConversationBody> = fc.record({
  title: arbTitle,
  titleIsCustom: fc.boolean(),
  specs: fc.array(arbMessageSpec, { maxLength: 6 }),
  createdAt: arbIso,
  updatedAt: arbIso,
})

function buildConversation(body: ConversationBody, id: string, sessionId: string): Conversation {
  return {
    id,
    sessionId,
    title: body.title,
    titleIsCustom: body.titleIsCustom,
    messages: body.specs.map((spec, index) => buildMessage(spec, `${id}:${index}`, body.createdAt)),
    createdAt: body.createdAt,
    updatedAt: body.updatedAt,
  }
}

interface StateOptions {
  /** Garante no máximo uma conversa vazia (estado alcançável, INV-09). */
  atMostOneEmpty?: boolean
  /** Inclui conversas com pergunta em andamento. */
  withPending?: boolean
}

/** Estados válidos (INV-01 a INV-08) com 1 a 5 conversas. */
export function arbConversationsState({
  atMostOneEmpty = true,
  withPending = true,
}: StateOptions = {}): fc.Arbitrary<ConversationsState> {
  return fc.integer({ min: 1, max: 5 }).chain((count) =>
    fc
      .tuple(
        fc.uniqueArray(fc.uuid(), { minLength: count * 2, maxLength: count * 2 }),
        fc.array(arbConversationBody, { minLength: count, maxLength: count }),
        fc.nat({ max: count - 1 }),
        fc.boolean(),
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
      )
      .map(([uuids, bodies, activeIndex, storageWarning, pendingFlags]) => {
        let seenEmpty = false
        const conversations = bodies.map((body, index) => {
          let fixed = body
          if (atMostOneEmpty && body.specs.length === 0) {
            if (seenEmpty) fixed = { ...body, specs: [{ kind: 'user', content: 'pergunta' }] }
            seenEmpty = true
          }
          return buildConversation(fixed, uuids[index]!, uuids[count + index]!)
        })
        const pending: Record<string, true> = {}
        if (withPending) {
          conversations.forEach((conversation, index) => {
            if (pendingFlags[index]) pending[conversation.id] = true
          })
        }
        return {
          conversations,
          activeConversationId: conversations[activeIndex]!.id,
          pending,
          storageWarning,
        }
      }),
  )
}

/** Estados persistíveis (sem pending nem storageWarning). */
export const arbPersistedState: fc.Arbitrary<PersistedState> = arbConversationsState({
  atMostOneEmpty: false,
  withPending: false,
}).map((state) => ({
  version: STORAGE_VERSION,
  activeConversationId: state.activeConversationId,
  conversations: state.conversations,
}))

interface ConversationRef {
  n: number
  unknown: boolean
}

const arbRef: fc.Arbitrary<ConversationRef> = fc.record({
  n: fc.nat(10),
  unknown: fc.oneof({ weight: 8, arbitrary: fc.constant(false) }, { weight: 1, arbitrary: fc.constant(true) }),
})

export type ActionSpec =
  | { type: 'create' }
  | { type: 'select'; ref: ConversationRef }
  | { type: 'rename'; ref: ConversationRef; title: string }
  | { type: 'delete'; ref: ConversationRef }
  | { type: 'sendStarted'; ref: ConversationRef; text: string }
  | { type: 'retryStarted'; ref: ConversationRef }
  | { type: 'answerReceived'; ref: ConversationRef; content: string; sources: SourceRef[]; contextReset: boolean }
  | { type: 'answerFailed'; ref: ConversationRef; errorKind: ErrorKind }
  | { type: 'setStorageWarning'; value: boolean }

export const arbActionSpec: fc.Arbitrary<ActionSpec> = fc.oneof(
  fc.constant({ type: 'create' as const }),
  fc.record({ type: fc.constant('select' as const), ref: arbRef }),
  fc.record({ type: fc.constant('rename' as const), ref: arbRef, title: arbText }),
  fc.record({ type: fc.constant('delete' as const), ref: arbRef }),
  fc.record({ type: fc.constant('sendStarted' as const), ref: arbRef, text: arbNonBlankText }),
  fc.record({ type: fc.constant('retryStarted' as const), ref: arbRef }),
  fc.record({
    type: fc.constant('answerReceived' as const),
    ref: arbRef,
    content: arbNonBlankText,
    sources: arbSourcesWithDuplicates,
    contextReset: fc.boolean(),
  }),
  fc.record({ type: fc.constant('answerFailed' as const), ref: arbRef, errorKind: arbErrorKind }),
  fc.record({ type: fc.constant('setStorageWarning' as const), value: fc.boolean() }),
)

/** Transforma uma descrição de ação em ação concreta, resolvendo referências contra o estado atual. */
export function concretize(spec: ActionSpec, state: ConversationsState, step: number): ConversationsAction {
  const ids = state.conversations.map((c) => c.id)
  const resolve = (ref: ConversationRef): string =>
    ref.unknown || ids.length === 0 ? 'conversa-inexistente' : ids[ref.n % ids.length]!
  const now = `2026-06-01T00:${String(Math.floor(step / 60) % 60).padStart(2, '0')}:${String(step % 60).padStart(2, '0')}.000Z`

  switch (spec.type) {
    case 'create':
      return { type: 'create', fresh: createConversation(`nova-${step}`, `sessao-nova-${step}`, now) }
    case 'select':
      return { type: 'select', id: resolve(spec.ref) }
    case 'rename':
      return { type: 'rename', id: resolve(spec.ref), title: spec.title, now }
    case 'delete':
      return {
        type: 'delete',
        id: resolve(spec.ref),
        replacement: createConversation(`reposicao-${step}`, `sessao-reposicao-${step}`, now),
      }
    case 'sendStarted':
      return {
        type: 'sendStarted',
        conversationId: resolve(spec.ref),
        message: buildMessage({ kind: 'user', content: spec.text }, `msg-${step}`, now),
        now,
      }
    case 'retryStarted':
      return { type: 'retryStarted', conversationId: resolve(spec.ref), now }
    case 'answerReceived':
      return {
        type: 'answerReceived',
        conversationId: resolve(spec.ref),
        message: buildMessage(
          { kind: 'assistant', content: spec.content, sources: spec.sources, contextReset: spec.contextReset },
          `msg-${step}`,
          now,
        ),
        now,
      }
    case 'answerFailed':
      return {
        type: 'answerFailed',
        conversationId: resolve(spec.ref),
        message: buildMessage({ kind: 'error', errorKind: spec.errorKind }, `msg-${step}`, now),
        now,
      }
    case 'setStorageWarning':
      return { type: 'setStorageWarning', value: spec.value }
  }
}
