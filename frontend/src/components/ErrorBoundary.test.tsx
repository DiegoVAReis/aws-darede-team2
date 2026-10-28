import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb(): never {
  throw new Error('conteúdo sensível da conversa')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('mostra os filhos quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p>tudo certo</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('tudo certo')).toBeInTheDocument()
  })

  it('mostra uma mensagem em vez de tela em branco e não loga o conteúdo do erro', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado. Recarregue a página.')
    const ourCalls = consoleError.mock.calls.filter((call) => call[0] === 'Erro inesperado na interface.')
    expect(ourCalls).toHaveLength(1)
    expect(ourCalls[0]).toHaveLength(1)
  })
})
