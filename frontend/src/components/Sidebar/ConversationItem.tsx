import { useRef, useState, type KeyboardEvent } from 'react'
import { MAX_TITLE_LENGTH } from '../../constants'
import { normalizeRename } from '../../state/conversationRules'
import type { Conversation } from '../../types'
import styles from './ConversationItem.module.css'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onRequestDelete: () => void
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  )
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onRequestDelete,
}: ConversationItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(conversation.title)
  // Evita confirmar duas vezes (Enter seguido do blur) ou confirmar depois de Esc.
  const finished = useRef(false)

  const startEditing = () => {
    finished.current = false
    setDraft(conversation.title)
    setEditing(true)
  }

  const commit = () => {
    if (finished.current) return
    finished.current = true
    const title = normalizeRename(draft)
    if (title !== null) onRename(title)
    setEditing(false)
  }

  const cancel = () => {
    finished.current = true
    setEditing(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  return (
    <li className={`${styles.item} ${isActive ? styles.active : ''}`} data-testid="conversation-item">
      {editing ? (
        <input
          className={styles.input}
          value={draft}
          maxLength={MAX_TITLE_LENGTH}
          autoFocus
          aria-label="Novo título da conversa"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          data-testid="conversation-item-rename-input"
        />
      ) : (
        <>
          <button
            type="button"
            className={styles.select}
            aria-current={isActive ? 'true' : undefined}
            onClick={onSelect}
            data-testid="conversation-item-select-button"
          >
            <span className={styles.title}>{conversation.title}</span>
          </button>
          <button
            type="button"
            className={styles.action}
            aria-label={`Renomear conversa ${conversation.title}`}
            onClick={startEditing}
            data-testid="conversation-item-rename-button"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            className={styles.action}
            aria-label={`Excluir conversa ${conversation.title}`}
            onClick={onRequestDelete}
            data-testid="conversation-item-delete-button"
          >
            <TrashIcon />
          </button>
        </>
      )}
    </li>
  )
}
