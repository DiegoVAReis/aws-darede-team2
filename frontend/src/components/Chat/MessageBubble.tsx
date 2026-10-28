import type { Message } from '../../types'
import { MarkdownContent } from './MarkdownContent'
import styles from './MessageBubble.module.css'
import { SourceList } from './SourceList'

interface MessageBubbleProps {
  message: Message
  showRetry: boolean
  onRetry: () => void
}

export function MessageBubble({ message, showRetry, onRetry }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <article className={`${styles.bubble} ${styles.user}`} aria-label="Sua mensagem" data-testid="message-user">
        <p className={styles.plain}>{message.content}</p>
      </article>
    )
  }

  if (message.isError) {
    return (
      <article className={`${styles.bubble} ${styles.error}`} aria-label="Erro" data-testid="message-error">
        <p className={styles.plain}>{message.content}</p>
        {showRetry && (
          <button type="button" className={styles.retry} onClick={onRetry} data-testid="message-retry-button">
            Tentar novamente
          </button>
        )}
      </article>
    )
  }

  return (
    <article
      className={`${styles.bubble} ${styles.assistant}`}
      aria-label="Resposta do assistente"
      data-testid="message-assistant"
    >
      <MarkdownContent content={message.content} />
      <SourceList sources={message.sources} />
    </article>
  )
}
