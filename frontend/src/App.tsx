import { useRef } from 'react'
import styles from './App.module.css'
import { ChatWindow } from './components/Chat/ChatWindow'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/Sidebar/Sidebar'
import { ConversationsProvider, type ConversationsServices } from './state/ConversationsContext'

interface AppProps {
  /** Só para testes: armazenamento e geradores de id e hora. */
  storage?: Storage | null
  services?: Partial<ConversationsServices>
}

export default function App({ storage, services }: AppProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  return (
    <ErrorBoundary>
      <ConversationsProvider storage={storage} services={services}>
        <h1 className="sr-only">Assistente de Conhecimento Interno da Anyone Agro Business</h1>
        <div className={styles.layout}>
          <Sidebar onConversationCreated={() => inputRef.current?.focus()} />
          <ChatWindow inputRef={inputRef} />
        </div>
      </ConversationsProvider>
    </ErrorBoundary>
  )
}
