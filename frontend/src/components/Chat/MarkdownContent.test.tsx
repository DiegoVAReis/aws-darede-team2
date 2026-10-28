import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownContent } from './MarkdownContent'

describe('MarkdownContent', () => {
  it('renderiza negrito, listas e tabelas', () => {
    const content = [
      'Texto com **negrito**.',
      '',
      '- primeiro',
      '- segundo',
      '',
      '| Modelo | Garantia |',
      '| --- | --- |',
      '| Trator | 12 meses |',
    ].join('\n')
    render(<MarkdownContent content={content} />)

    expect(screen.getByText('negrito').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '12 meses' })).toBeInTheDocument()
  })

  it('abre links http e https em nova aba com rel seguro', () => {
    render(<MarkdownContent content="Veja [o portal](https://exemplo.com.br/ajuda)." />)
    const link = screen.getByRole('link', { name: 'o portal' })
    expect(link).toHaveAttribute('href', 'https://exemplo.com.br/ajuda')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it.each(['javascript:alert(1)', 'data:text/html;base64,AAAA', 'ftp://exemplo.com/arquivo', 'mailto:a@b.com'])(
    'não cria link para %s',
    (href) => {
      render(<MarkdownContent content={`[clique aqui](${href})`} />)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByText('clique aqui')).toBeInTheDocument()
    },
  )

  it('não carrega imagens e mostra o texto alternativo', () => {
    const { container } = render(<MarkdownContent content="![logotipo da empresa](https://exemplo.com/logo.png)" />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('logotipo da empresa')).toBeInTheDocument()
  })

  it('ignora HTML bruto', () => {
    const { container } = render(
      <MarkdownContent content={'Antes <script>window.hack = 1</script> <b>negrito html</b> depois'} />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect((window as unknown as { hack?: number }).hack).toBeUndefined()
  })
})
