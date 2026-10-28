import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SourceList } from './SourceList'

describe('SourceList', () => {
  it('não renderiza nada sem fontes', () => {
    const { container } = render(<SourceList sources={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra título e arquivo de cada fonte na ordem recebida', () => {
    render(
      <SourceList
        sources={[
          { file: 'maquinas_agricolas_catalogo.md', title: 'UN Máquinas — Catálogo' },
          { file: 'seguros_agricolas.md', title: 'UN Cooperativa — Seguros Agrícolas' },
        ]}
      />,
    )
    const items = screen.getAllByTestId('source-list-item')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText('UN Máquinas — Catálogo')).toBeInTheDocument()
    expect(within(items[0]!).getByText('maquinas_agricolas_catalogo.md')).toBeInTheDocument()
    expect(within(items[1]!).getByText('seguros_agricolas.md')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Fontes' })).toBeInTheDocument()
  })

  it('mostra só o arquivo quando o título é vazio', () => {
    render(<SourceList sources={[{ file: 'faq.md', title: '' }]} />)
    const item = screen.getByTestId('source-list-item')
    expect(item).toHaveTextContent('faq.md')
    expect(within(item).getAllByText('faq.md')).toHaveLength(1)
  })
})
