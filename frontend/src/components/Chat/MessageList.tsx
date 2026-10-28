import { Fragment, useEffect, useRef } from 'react'
import { CONTEXT_RESET_TEXT } from '../../constants'
import type { Message } from '../../types'
import { LoadingIndicator } from './LoadingIndicator'
import { MessageBubble } from './MessageBubble'
import styles from './MessageList.module.css'
import { Notice } from './Notice'

interface MessageListProps {
  conversationId: string
  messages: Message[]
  isLoading: boolean
  canRetry: boolean
  onRetry: () => void
}

export function MessageList({ conversationId, messages, isLoading, canRetry, onRetry }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // BR-ENV-14: rola até o fim quando chega mensagem, o carregamento aparece ou a conversa muda.
  useEffect(() => {
    const element = containerRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [conversationId, messages.length, isLoading])

  return (
    <div
      ref={containerRef}
      className={styles.list}
      role="log"
      aria-live="polite"
      aria-label="Mensagens da conversa"
      data-testid="message-list"
    >
      {messages.map((message, index) => (
        <Fragment key={message.id}>
          {message.contextReset && <Notice kind="contextReset">{CONTEXT_RESET_TEXT}</Notice>}
          <MessageBubble
            message={message}
            showRetry={canRetry && index === messages.length - 1}
            onRetry={onRetry}
          />
        </Fragment>
      ))}
      {isLoading && <LoadingIndicator />}
    </div>
  )
}
