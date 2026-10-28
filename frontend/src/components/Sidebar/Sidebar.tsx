import { useRef, useState } from 'react'
import { useConversations } from '../../state/ConversationsContext'
import { ConfirmDialog } from './ConfirmDialog'
import { ConversationItem } from './ConversationItem'
import styles from './Sidebar.module.css'

interface SidebarProps {
  /** Chamado depois de "Nova conversa" para levar o foco ao campo de entrada. */
  onConversationCreated?: () => void
}

export function Sidebar({ onConversationCreated }: SidebarProps) {
  const { dispatch, sortedConversations, activeConversation, services, newConversation } = useConversations()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const newButtonRef = useRef<HTMLButtonElement>(null)

  const handleNew = () => {
    dispatch({ type: 'create', fresh: newConversation() })
    onConversationCreated?.()
  }

  const handleConfirmDelete = () => {
    if (pendingDeleteId === null) return
    dispatch({ type: 'delete', id: pendingDeleteId, replacement: newConversation() })
    setPendingDeleteId(null)
    // O botão que abriu o diálogo deixou de existir: o foco vai para "Nova conversa".
    newButtonRef.current?.focus()
  }

  return (
    <nav className={styles.sidebar} aria-label="Conversas" data-testid="sidebar">
      <p className={styles.brand}>Assistente Anyone Agro</p>
      <button
        ref={newButtonRef}
        type="button"
        className={styles.newButton}
        onClick={handleNew}
        data-testid="sidebar-new-conversation-button"
      >
        + Nova conversa
      </button>
      <ul className={styles.list}>
        {sortedConversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeConversation.id}
            onSelect={() => dispatch({ type: 'select', id: conversation.id })}
            onRename={(title) => dispatch({ type: 'rename', id: conversation.id, title, now: services.now() })}
            onRequestDelete={() => setPendingDeleteId(conversation.id)}
          />
        ))}
      </ul>
      {pendingDeleteId !== null && (
        <ConfirmDialog
          title="Excluir esta conversa?"
          message="As mensagens desta conversa serão apagadas deste navegador."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </nav>
  )
}
