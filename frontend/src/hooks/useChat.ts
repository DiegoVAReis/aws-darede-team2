import { useCallback } from 'react'
import { ApiRequestError, askQuestion } from '../api/client'
import { errorText } from '../api/errorMessages'
import { dedupeSources } from '../state/conversationRules'
import { useConversations } from '../state/ConversationsContext'
import { canRetryConversation } from '../state/conversationsReducer'
import { validateQuestion } from '../state/questionValidation'
import type { AskResponse, ErrorKind, Message } from '../types'

export type AskFunction = (text: string, sessionId: string) => Promise<AskResponse>

interface UseChatOptions {
  /** Permite trocar a chamada à API nos testes. */
  ask?: AskFunction
}

interface UseChatResult {
  sendMessage: (text: string) => Promise<void>
  retryLast: () => Promise<void>
  /** A conversa ativa está aguardando resposta. */
  isLoading: boolean
  canRetry: boolean
}

const defaultAsk: AskFunction = (text, sessionId) => askQuestion(text, sessionId)

/** Fluxo de enviar uma pergunta (BR-ENV-*, BR-ERR-*). */
export function useChat({ ask = defaultAsk }: UseChatOptions = {}): UseChatResult {
  const { activeConversation, dispatch, isPending, services, beginRequest, endRequest } =
    useConversations()

  const run = useCallback(
    async (conversationId: string, sessionId: string, text: string) => {
      try {
        const response = await ask(text, sessionId)
        const message: Message = {
          id: services.generateId(),
          role: 'assistant',
          content: response.answer,
          sources: dedupeSources(response.sources),
          createdAt: services.now(),
          ...(response.session_reset ? { contextReset: true } : {}),
        }
        dispatch({ type: 'answerReceived', conversationId, message, now: services.now() })
      } catch (error) {
        const kind: ErrorKind = error instanceof ApiRequestError ? error.kind : 'UNEXPECTED_RESPONSE'
        const message: Message = {
          id: services.generateId(),
          role: 'assistant',
          content: errorText(kind),
          sources: [],
          createdAt: services.now(),
          isError: true,
          errorKind: kind,
        }
        dispatch({ type: 'answerFailed', conversationId, message, now: services.now() })
      } finally {
        endRequest(conversationId)
      }
    },
    [ask, dispatch, endRequest, services],
  )

  const sendMessage = useCallback(
    async (raw: string) => {
      const validation = validateQuestion(raw)
      if (!validation.ok) return
      const conversation = activeConversation
      if (isPending(conversation.id) || !beginRequest(conversation.id)) return
      const message: Message = {
        id: services.generateId(),
        role: 'user',
        content: validation.text,
        sources: [],
        createdAt: services.now(),
      }
      dispatch({ type: 'sendStarted', conversationId: conversation.id, message, now: services.now() })
      await run(conversation.id, conversation.sessionId, validation.text)
    },
    [activeConversation, beginRequest, dispatch, isPending, run, services],
  )

  const retryLast = useCallback(async () => {
    const conversation = activeConversation
    if (isPending(conversation.id) || !canRetryConversation(conversation)) return
    const question = conversation.messages.at(-2)
    if (!question || !beginRequest(conversation.id)) return
    dispatch({ type: 'retryStarted', conversationId: conversation.id, now: services.now() })
    await run(conversation.id, conversation.sessionId, question.content)
  }, [activeConversation, beginRequest, dispatch, isPending, run, services])

  return {
    sendMessage,
    retryLast,
    isLoading: isPending(activeConversation.id),
    canRetry: !isPending(activeConversation.id) && canRetryConversation(activeConversation),
  }
}
