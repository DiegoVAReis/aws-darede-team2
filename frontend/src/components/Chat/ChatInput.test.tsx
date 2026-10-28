import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChatInput } from './ChatInput'

const field = () => screen.getByRole('textbox', { name: 'Digite sua pergunta' })
const sendButton = () => screen.getByRole('button', { name: 'Enviar pergunta' })

describe('ChatInput', () => {
  it('envia o texto aparado com Enter e limpa o campo', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} disabled={false} />)

    await user.type(field(), '  Qual a garantia?  {Enter}')

    expect(onSend).toHaveBeenCalledExactlyOnceWith('Qual a garantia?')
    expect(field()).toHaveValue('')
    expect(field()).toHaveFocus()
  })

  it('envia pelo botão', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} disabled={false} />)

    await user.type(field(), 'Oi')
    await user.click(sendButton())

    expect(onSend).toHaveBeenCalledExactlyOnceWith('Oi')
  })

  it('Shift+Enter quebra a linha sem enviar', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} disabled={false} />)

    await user.type(field(), 'linha 1{Shift>}{Enter}{/Shift}linha 2')

    expect(onSend).not.toHaveBeenCalled()
    expect(field()).toHaveValue('linha 1\nlinha 2')
  })

  it('não envia com Enter durante a composição de um método de entrada', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)
    fireEvent.change(field(), { target: { value: 'ação' } })

    fireEvent.keyDown(field(), { key: 'Enter', isComposing: true })

    expect(onSend).not.toHaveBeenCalled()
  })

  it('mantém o botão desabilitado e ignora Enter com texto vazio ou só espaços', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} disabled={false} />)

    expect(sendButton()).toBeDisabled()
    await user.type(field(), '   {Enter}')
    expect(onSend).not.toHaveBeenCalled()
    expect(sendButton()).toBeDisabled()
  })

  it('bloqueia o envio com disabled, mas permite digitar', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} disabled />)

    await user.type(field(), 'próxima pergunta{Enter}')

    expect(field()).toHaveValue('próxima pergunta')
    expect(sendButton()).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('mostra o contador a partir de 1800 caracteres', () => {
    render(<ChatInput onSend={() => {}} disabled={false} />)

    fireEvent.change(field(), { target: { value: 'a'.repeat(1799) } })
    expect(screen.queryByTestId('chat-input-counter')).not.toBeInTheDocument()

    fireEvent.change(field(), { target: { value: 'a'.repeat(1800) } })
    expect(screen.getByTestId('chat-input-counter')).toHaveTextContent('1800/2000')
    expect(sendButton()).toBeEnabled()
  })

  it('bloqueia o envio acima de 2000 caracteres e explica o motivo', async () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)

    fireEvent.change(field(), { target: { value: 'a'.repeat(2001) } })

    expect(screen.getByTestId('chat-input-error')).toHaveTextContent('A pergunta passa de 2000 caracteres')
    expect(screen.getByTestId('chat-input-counter')).toHaveTextContent('2001/2000')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    expect(sendButton()).toBeDisabled()
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('aceita exatamente 2000 caracteres', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)
    fireEvent.change(field(), { target: { value: 'a'.repeat(2000) } })
    fireEvent.click(sendButton())
    expect(onSend).toHaveBeenCalledTimes(1)
  })
})
