import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/** NFR-F-27: evita a tela em branco. As conversas continuam guardadas no navegador. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // NFR-F-12: sem conteúdo de conversa no console.
    console.error('Erro inesperado na interface.')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: '2rem' }} data-testid="error-boundary-fallback">
          Algo deu errado. Recarregue a página.
        </div>
      )
    }
    return this.props.children
  }
}
