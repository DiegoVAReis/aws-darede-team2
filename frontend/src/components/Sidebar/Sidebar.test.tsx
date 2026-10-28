import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, STORAGE_VERSION } from '../../constants'
import { serializeState } from '../../storage/persistence'
import { MemoryStorage, makeConversation, makeMessage, renderWithProvider } from '../../test/helpers'
import type { Conversation } from '../../types'
import { Sidebar } from './Sidebar'

function storageWith(conversations: Conversation[], active = conversations[0]!.id): MemoryStorage {
  const storage = new MemoryStorage()
  storage.setItem(
    STORAGE_KEY,
    serializeState({ version: STORAGE_VERSION, activeConversationId: active, conversations }),
  )
  return storage
}

const withHistory = (id: string, title: string, updatedAt: string): Conversation =>
  makeConversation({
    id,
    title,
    updatedAt,
    messages: [makeMessage({ id: `${id}-1`, role: 'user' }), makeMessage({ id: `${id}-2`, role: 'assistant' })],
  })

const itemTitles = () =>
  screen.getAllByTestId('conversation-item-select-button').map((button) => button.textContent)

describe('Sidebar', () => {
  it('lista as conversas da mais recente para a mais antiga e marca a ativa', () => {
    const storage = storageWith(
      [
        withHistory('a', 'Antiga', '2026-06-01T10:00:00.000Z'),
        withHistory('b', 'Recente', '2026-06-01T12:00:00.000Z'),
      ],
      'a',
    )
    renderWithProvider(<Sidebar />, { storage })

    expect(itemTitles()).toEqual(['Recente', 'Antiga'])
    expect(screen.getByRole('button', { name: 'Antiga' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Recente' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('navigation', { name: 'Conversas' })).toBeInTheDocument()
  })

  it('troca a conversa ativa ao clicar', async () => {
    const storage = storageWith(
      [withHistory('a', 'Primeira', '2026-06-01T10:00:00.000Z'), withHistory('b', 'Segunda', '2026-06-01T11:00:00.000Z')],
      'a',
    )
    renderWithProvider(<Sidebar />, { storage })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Segunda' }))

    expect(screen.getByRole('button', { name: 'Segunda' })).toHaveAttribute('aria-current', 'true')
  })

  it('"Nova conversa" cria uma vez e depois reutiliza a conversa vazia', async () => {
    const onCreated = vi.fn()
    const user = userEvent.setup()
    renderWithProvider(<Sidebar onConversationCreated={onCreated} />, {
      storage: storageWith([withHistory('a', 'Garantia', '2026-06-01T10:00:00.000Z')]),
    })
    expect(itemTitles()).toEqual(['Garantia'])

    await user.click(screen.getByRole('button', { name: '+ Nova conversa' }))
    expect(itemTitles()).toEqual(['Nova conversa', 'Garantia'])

    await user.click(screen.getByRole('button', { name: '+ Nova conversa' }))
    expect(itemTitles()).toEqual(['Nova conversa', 'Garantia'])
    expect(onCreated).toHaveBeenCalledTimes(2)
  })

  describe('renomear', () => {
    const setup = () => {
      const storage = storageWith([withHistory('a', 'Garantia', '2026-06-01T10:00:00.000Z')])
      renderWithProvider(<Sidebar />, { storage })
      return userEvent.setup()
    }

    it('confirma com Enter e mostra o novo título', async () => {
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Renomear conversa Garantia' }))
      const input = screen.getByRole('textbox', { name: 'Novo título da conversa' })
      expect(input).toHaveFocus()
      expect(input).toHaveAttribute('maxlength', '60')

      await user.clear(input)
      await user.type(input, '  Seguro da safra  {Enter}')

      expect(itemTitles()).toEqual(['Seguro da safra'])
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('Esc cancela e mantém o título', async () => {
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Renomear conversa Garantia' }))
      await user.type(screen.getByRole('textbox'), 'descartado{Escape}')
      expect(itemTitles()).toEqual(['Garantia'])
    })

    it('título vazio cancela a edição e mantém o anterior', async () => {
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Renomear conversa Garantia' }))
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, '   {Enter}')
      expect(itemTitles()).toEqual(['Garantia'])
    })

    it('sair do campo confirma um título válido', async () => {
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Renomear conversa Garantia' }))
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, 'Crédito')
      await user.tab()
      expect(itemTitles()).toEqual(['Crédito'])
    })
  })

  describe('excluir', () => {
    const setup = () => {
      const storage = storageWith([
        withHistory('a', 'Primeira', '2026-06-01T10:00:00.000Z'),
        withHistory('b', 'Segunda', '2026-06-01T11:00:00.000Z'),
      ])
      renderWithProvider(<Sidebar />, { storage })
      return userEvent.setup()
    }

    it('pede confirmação e não exclui ao cancelar', async () => {
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Excluir conversa Primeira' }))
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(itemTitles()).toEqual(['Segunda', 'Primeira'])
    })

    it('exclui ao confirmar e leva o foco para "Nova conversa"', async () => {
      const user = setup()
      await user.click(screen.getByRole('button', { name: 'Excluir conversa Primeira' }))
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }))

      expect(itemTitles()).toEqual(['Segunda'])
      expect(screen.getByRole('button', { name: '+ Nova conversa' })).toHaveFocus()
    })

    it('ao excluir a última conversa, abre uma conversa vazia', async () => {
      const user = setup()
      for (const title of ['Primeira', 'Segunda']) {
        await user.click(screen.getByRole('button', { name: `Excluir conversa ${title}` }))
        await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }))
      }
      expect(itemTitles()).toEqual(['Nova conversa'])
    })
  })
})
