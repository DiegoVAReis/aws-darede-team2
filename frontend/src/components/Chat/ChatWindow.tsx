import type { RefObject } from 'react'
import { STORAGE_WARNING_TEXT, SUGGESTED_QUESTIONS } from '../../constants'
import { useChat } from '../../hooks/useChat'
import { useConversations } from '../../state/ConversationsContext'
import styles from './ChatWindow.module.css'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { Notice } from './Notice'
import { SuggestedQuestions } from './SuggestedQuestions'

interface ChatWindowProps {
  inputRef?: RefObject<HTMLTextAreaElement>
}

export function ChatWindow({ inputRef }: ChatWindowProps) {
  const { state, activeConversation } = useConversations()
  const { sendMessage, retryLast, isLoading, canRetry } = useChat()
  const isEmpty = activeConversation.messages.length === 0

  return (
    <main className={styles.window} aria-label="Conversa" data-testid="chat-window">
      {state.storageWarning && <Notice kind="storage">{STORAGE_WARNING_TEXT}</Notice>}
      {isEmpty ? (
        <SuggestedQuestions questions={SUGGESTED_QUESTIONS} onSelect={(question) => void sendMessage(question)} />
      ) : (
        <MessageList
          conversationId={activeConversation.id}
          messages={activeConversation.messages}
          isLoading={isLoading}
          canRetry={canRetry}
          onRetry={() => void retryLast()}
        />
      )}
      <ChatInput onSend={(text) => void sendMessage(text)} disabled={isLoading} textareaRef={inputRef} />
    </main>
  )
}
