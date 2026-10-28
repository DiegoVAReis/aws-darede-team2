import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CONTEXT_RESET_TEXT } from '../../constants'
import { makeMessage } from '../../test/helpers'
import { MessageList } from './MessageList'

const base = { conversationId: 'c1', isLoading: false, canRetry: false, onRetry: () => {} }

describe('MessageList', () => {
  it('é uma região de log acessível com as mensagens na ordem', () => {
    render(
      <MessageList
        {...base}
        messages={[
          makeMessage({ id: '1', role: 'user', content: 'Primeira pergunta' }),
          makeMessage({ id: '2', role: 'assistant', content: 'Primeira resposta' }),
        ]}
      />,
    )
    const log = screen.getByRole('log', { name: 'Mensagens da conversa' })
    expect(log).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Primeira pergunta')).toBeInTheDocument()
    expect(screen.getByText('Primeira resposta')).toBeInTheDocument()
  })

  it('mostra o aviso de contexto reiniciado uma vez, acima da resposta marcada', () => {
    render(
      <MessageList
        {...base}
        messages={[
          makeMessage({ id: '1', role: 'user' }),
          makeMessage({ id: '2', role: 'assistant', content: 'Resposta nova', contextReset: true }),
          makeMessage({ id: '3', role: 'user' }),
          makeMessage({ id: '4', role: 'assistant', content: 'Outra resposta' }),
        ]}
      />,
    )
    const notices = screen.getAllByTestId('notice-contextReset')
    expect(notices).toHaveLength(1)
    expect(notices[0]).toHaveTextContent(CONTEXT_RESET_TEXT)
    const answer = screen.getByText('Resposta nova').closest('article')!
    expect(notices[0]!.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('mostra "Tentar novamente" só na última bolha de erro e quando canRetry', async () => {
    const onRetry = vi.fn()
    const messages = [
      makeMessage({ id: '1', role: 'user' }),
      makeMessage({ id: '2', role: 'assistant', isError: true, errorKind: 'NETWORK', content: 'Falha antiga' }),
      makeMessage({ id: '3', role: 'user' }),
      makeMessage({ id: '4', role: 'assistant', isError: true, errorKind: 'TIMEOUT', content: 'Falha atual' }),
    ]
    const { rerender } = render(<MessageList {...base} messages={messages} canRetry onRetry={onRetry} />)
    const buttons = screen.getAllByRole('button', { name: 'Tentar novamente' })
    expect(buttons).toHaveLength(1)
    await userEvent.setup().click(buttons[0]!)
    expect(onRetry).toHaveBeenCalledTimes(1)

    rerender(<MessageList {...base} messages={messages} canRetry={false} onRetry={onRetry} />)
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('mostra o indicador de carregamento', () => {
    render(<MessageList {...base} messages={[makeMessage({ id: '1', role: 'user' })]} isLoading />)
    expect(screen.getByTestId('loading-indicator')).toHaveTextContent('Aguardando resposta')
  })

  it('mostra a lista de fontes só nas respostas que as têm', () => {
    render(
      <MessageList
        {...base}
        messages={[
          makeMessage({ id: '1', role: 'user' }),
          makeMessage({
            id: '2',
            role: 'assistant',
            sources: [{ file: 'a.md', title: 'Documento A' }],
          }),
          makeMessage({ id: '3', role: 'user' }),
          makeMessage({ id: '4', role: 'assistant', content: 'Fora da base' }),
        ]}
      />,
    )
    expect(screen.getAllByTestId('source-list')).toHaveLength(1)
  })
})
