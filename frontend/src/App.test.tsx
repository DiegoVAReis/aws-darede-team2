import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTEXT_RESET_TEXT, STORAGE_KEY, STORAGE_VERSION, STORAGE_WARNING_TEXT } from './constants'
import { ERROR_TEXTS } from './api/errorMessages'
import { serializeState } from './storage/persistence'
import { MemoryStorage, createTestServices, makeConversation, makeMessage, renderApp } from './test/helpers'

const SOURCE_TITLE = 'UN Máquinas — Catálogo Técnico de Equipamentos'
const SOURCE_FILE = 'maquinas_agricolas_catalogo.md'

function okBody(overrides: Record<string, unknown> = {}) {
  return {
    answer: 'A garantia é de **12 meses**.',
    sources: [{ file: SOURCE_FILE, title: SOURCE_TITLE }],
    session_id: 'ignorado',
    session_reset: false,
    ...overrides,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function errorResponse(code: string, status: number): Response {
  return jsonResponse({ error: { code, message: 'texto da API que não deve aparecer' } }, status)
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse(okBody()))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const input = () => screen.getByRole('textbox', { name: 'Digite sua pergunta' })
const sidebarTitles = () =>
  screen.getAllByTestId('conversation-item-select-button').map((button) => button.textContent)
const requestBody = (callIndex = 0) =>
  JSON.parse((fetchMock.mock.calls[callIndex]![1] as RequestInit).body as string) as {
    text: string
    session_id: string
  }

async function ask(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(input(), `${text}{Enter}`)
}

describe('App: tela inicial', () => {
  it('mostra as sugestões, o campo de entrada e uma conversa vazia na barra lateral', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'Como posso ajudar?' })).toBeInTheDocument()
    expect(screen.getAllByTestId('suggested-questions-button')).toHaveLength(4)
    expect(sidebarTitles()).toEqual(['Nova conversa'])
    expect(screen.getByRole('main', { name: 'Conversa' })).toBeInTheDocument()
    expect(screen.queryByTestId('notice-storage')).not.toBeInTheDocument()
  })
})

describe('App: perguntar e responder (US-11, US-12)', () => {
  it('envia a pergunta, mostra o carregamento, a resposta em Markdown e as fontes', async () => {
    const pending = deferred<Response>()
    fetchMock.mockImplementationOnce(() => pending.promise)
    const user = userEvent.setup()
    renderApp()

    await ask(user, '  Qual a garantia dos tratores?  ')

    expect(screen.getByTestId('message-user')).toHaveTextContent('Qual a garantia dos tratores?')
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled()
    expect(screen.queryByTestId('suggested-questions')).not.toBeInTheDocument()

    pending.resolve(jsonResponse(okBody()))

    const strong = await screen.findByText('12 meses')
    expect(strong.tagName).toBe('STRONG')
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    const sources = screen.getByTestId('source-list')
    expect(within(sources).getByText(SOURCE_TITLE)).toBeInTheDocument()
    expect(within(sources).getByText(SOURCE_FILE)).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/v1\/ask$/)
    expect(init.method).toBe('POST')
    expect(requestBody()).toEqual({ text: 'Qual a garantia dos tratores?', session_id: expect.stringMatching(/^id-/) })
  })

  it('usa o início da primeira pergunta como título da conversa', async () => {
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Qual a garantia dos tratores?')
    await screen.findByText('12 meses')
    expect(sidebarTitles()).toEqual(['Qual a garantia dos tratores?'])
  })

  it('Shift+Enter quebra a linha sem enviar', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.type(input(), 'linha 1{Shift>}{Enter}{/Shift}linha 2')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(input()).toHaveValue('linha 1\nlinha 2')
  })

  it('reutiliza o mesmo session_id nas perguntas de acompanhamento', async () => {
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Qual a garantia dos tratores?')
    await screen.findByText('12 meses')
    await ask(user, 'E das colheitadeiras?')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    expect(requestBody(1).session_id).toBe(requestBody(0).session_id)
    expect(requestBody(1).text).toBe('E das colheitadeiras?')
  })

  it('não mostra lista de fontes quando sources vem vazio', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(okBody({ answer: 'Isto não veio da base interna.', sources: [] })),
    )
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Qual a receita de bolo?')
    await screen.findByText('Isto não veio da base interna.')
    expect(screen.queryByTestId('source-list')).not.toBeInTheDocument()
  })

  it('não repete arquivos nas fontes', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(
        okBody({
          sources: [
            { file: SOURCE_FILE, title: SOURCE_TITLE },
            { file: SOURCE_FILE, title: SOURCE_TITLE },
          ],
        }),
      ),
    )
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Pergunta')
    await screen.findByText('12 meses')
    expect(screen.getAllByTestId('source-list-item')).toHaveLength(1)
  })

  it('não permite enviar de novo na mesma conversa enquanto aguarda', async () => {
    const pending = deferred<Response>()
    fetchMock.mockImplementationOnce(() => pending.promise)
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Primeira')
    await user.type(input(), 'Segunda{Enter}')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(input()).toHaveValue('Segunda')
    pending.resolve(jsonResponse(okBody()))
    await screen.findByText('12 meses')
  })
})

describe('App: sugestões (US-13)', () => {
  it('enviar uma sugestão a envia como pergunta e as sugestões somem', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /crédito rural/ }))

    await screen.findByText('12 meses')
    expect(requestBody().text).toBe('Como funciona o crédito rural para cooperados?')
    expect(screen.queryByTestId('suggested-questions')).not.toBeInTheDocument()
  })
})

describe('App: erros e nova tentativa (US-11)', () => {
  it.each([
    ['VALIDATION_ERROR', 422],
    ['KB_NOT_INDEXED', 503],
    ['UPSTREAM_ERROR', 502],
    ['INTERNAL_ERROR', 500],
  ] as const)('mostra o texto fixo para %s sem repetir o message da API', async (code, status) => {
    fetchMock.mockImplementation(async () => errorResponse(code, status))
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Pergunta')

    const bubble = await screen.findByTestId('message-error')
    expect(bubble).toHaveTextContent(ERROR_TEXTS[code])
    expect(bubble).not.toHaveTextContent('texto da API')
    // A conversa continua utilizável.
    expect(input()).toBeEnabled()
    expect(screen.getByTestId('message-user')).toHaveTextContent('Pergunta')
  })

  it('mostra o erro de rede quando o backend está fora do ar', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Pergunta')
    expect(await screen.findByTestId('message-error')).toHaveTextContent(ERROR_TEXTS.NETWORK)
  })

  it('"Tentar novamente" reenvia a pergunta sem duplicar a mensagem do usuário', async () => {
    fetchMock.mockImplementationOnce(async () => errorResponse('UPSTREAM_ERROR', 502))
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Qual a garantia?')
    await screen.findByTestId('message-error')

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await screen.findByText('12 meses')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestBody(1)).toEqual(requestBody(0))
    expect(screen.getAllByTestId('message-user')).toHaveLength(1)
    expect(screen.queryByTestId('message-error')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('uma nova pergunta depois do erro também funciona', async () => {
    fetchMock.mockImplementationOnce(async () => errorResponse('UPSTREAM_ERROR', 502))
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Primeira')
    await screen.findByTestId('message-error')

    await ask(user, 'Segunda')

    await screen.findByText('12 meses')
    expect(screen.getAllByTestId('message-user')).toHaveLength(2)
  })

  it('trata resposta fora do contrato como erro entendível', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ resposta: 'formato antigo' }))
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Pergunta')
    expect(await screen.findByTestId('message-error')).toHaveTextContent(ERROR_TEXTS.UNEXPECTED_RESPONSE)
  })
})

describe('App: contexto reiniciado (US-10)', () => {
  it('mostra o aviso uma vez, acima da resposta, e mantém as mensagens anteriores', async () => {
    fetchMock
      .mockImplementationOnce(async () => jsonResponse(okBody()))
      .mockImplementationOnce(async () => jsonResponse(okBody({ answer: 'Resposta depois do reinício.', session_reset: true })))
      .mockImplementationOnce(async () => jsonResponse(okBody({ answer: 'Resposta seguinte.' })))
    const user = userEvent.setup()
    renderApp()

    await ask(user, 'Primeira')
    await screen.findByText('12 meses')
    expect(screen.queryByTestId('notice-contextReset')).not.toBeInTheDocument()

    await ask(user, 'Segunda')
    await screen.findByText('Resposta depois do reinício.')
    const notice = screen.getByTestId('notice-contextReset')
    expect(notice).toHaveTextContent(CONTEXT_RESET_TEXT)
    expect(screen.getByText('12 meses')).toBeInTheDocument()
    expect(within(screen.getByTestId('message-list')).getByText('Primeira')).toBeInTheDocument()

    await ask(user, 'Terceira')
    await screen.findByText('Resposta seguinte.')
    expect(screen.getAllByTestId('notice-contextReset')).toHaveLength(1)
  })
})

describe('App: persistência ao recarregar (US-15)', () => {
  it('recupera conversas, mensagens, fontes, avisos e sessionId', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(okBody({ session_reset: true })))
    const user = userEvent.setup()
    const first = renderApp()
    await ask(user, 'Qual a garantia dos tratores?')
    await screen.findByText('12 meses')
    const sessionId = requestBody().session_id
    first.unmount()

    renderApp({ storage: first.storage, services: createTestServices('depois') })

    expect(sidebarTitles()).toEqual(['Qual a garantia dos tratores?'])
    expect(screen.getByText('12 meses')).toBeInTheDocument()
    expect(screen.getByText(SOURCE_TITLE)).toBeInTheDocument()
    expect(screen.getByTestId('notice-contextReset')).toBeInTheDocument()

    await ask(userEvent.setup(), 'E das colheitadeiras?')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(requestBody(1).session_id).toBe(sessionId)
  })

  it('inicia com uma conversa vazia quando o armazenamento está corrompido', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, '{ isto não é json')
    renderApp({ storage })
    expect(sidebarTitles()).toEqual(['Nova conversa'])
    expect(screen.getByTestId('suggested-questions')).toBeInTheDocument()
  })

  it('inicia vazio quando o armazenamento não pode ser lido', () => {
    const storage = new MemoryStorage()
    storage.failOnGet = true
    renderApp({ storage })
    expect(sidebarTitles()).toEqual(['Nova conversa'])
  })

  it('marca como "resposta não recebida" a pergunta que ficou sem resposta', async () => {
    const storage = new MemoryStorage()
    storage.setItem(
      STORAGE_KEY,
      serializeState({
        version: STORAGE_VERSION,
        activeConversationId: 'c1',
        conversations: [
          makeConversation({
            id: 'c1',
            sessionId: 'sessao-1',
            title: 'Garantia',
            messages: [makeMessage({ id: 'm1', role: 'user', content: 'Qual a garantia?' })],
          }),
        ],
      }),
    )
    renderApp({ storage })

    expect(screen.getByTestId('message-error')).toHaveTextContent(ERROR_TEXTS.NO_RESPONSE)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await screen.findByText('12 meses')
    expect(requestBody()).toEqual({ text: 'Qual a garantia?', session_id: 'sessao-1' })
  })

  it('avisa quando não consegue gravar e some o aviso depois de uma gravação bem-sucedida', async () => {
    const storage = new MemoryStorage()
    storage.failOnSet = true
    const user = userEvent.setup()
    renderApp({ storage })
    expect(screen.getByTestId('notice-storage')).toHaveTextContent(STORAGE_WARNING_TEXT)

    storage.failOnSet = false
    await ask(user, 'Pergunta')
    await screen.findByText('12 meses')

    await waitFor(() => expect(screen.queryByTestId('notice-storage')).not.toBeInTheDocument())
  })
})

describe('App: gerenciar conversas (US-14)', () => {
  it('cria, alterna e mantém o histórico de cada conversa', async () => {
    fetchMock
      .mockImplementationOnce(async () => jsonResponse(okBody({ answer: 'Resposta da conversa A.' })))
      .mockImplementationOnce(async () => jsonResponse(okBody({ answer: 'Resposta da conversa B.' })))
    const user = userEvent.setup()
    renderApp()

    await ask(user, 'Pergunta A')
    await screen.findByText('Resposta da conversa A.')
    await user.click(screen.getByRole('button', { name: '+ Nova conversa' }))
    expect(input()).toHaveFocus()
    expect(screen.getByTestId('suggested-questions')).toBeInTheDocument()

    await ask(user, 'Pergunta B')
    await screen.findByText('Resposta da conversa B.')
    expect(requestBody(1).session_id).not.toBe(requestBody(0).session_id)

    await user.click(screen.getByRole('button', { name: 'Pergunta A' }))
    expect(screen.getByText('Resposta da conversa A.')).toBeInTheDocument()
    expect(screen.queryByText('Resposta da conversa B.')).not.toBeInTheDocument()
  })

  it('renomeia e mantém o título depois de recarregar', async () => {
    const user = userEvent.setup()
    const first = renderApp()
    await user.click(screen.getByRole('button', { name: 'Renomear conversa Nova conversa' }))
    const rename = screen.getByRole('textbox', { name: 'Novo título da conversa' })
    await user.clear(rename)
    await user.type(rename, 'Meu assunto{Enter}')
    first.unmount()

    renderApp({ storage: first.storage, services: createTestServices('depois') })
    expect(sidebarTitles()).toEqual(['Meu assunto'])
  })

  it('exclui a conversa atual depois de confirmar e abre uma vazia', async () => {
    const user = userEvent.setup()
    renderApp()
    await ask(user, 'Pergunta')
    await screen.findByText('12 meses')

    await user.click(screen.getByRole('button', { name: 'Excluir conversa Pergunta' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }))

    expect(sidebarTitles()).toEqual(['Nova conversa'])
    expect(screen.getByTestId('suggested-questions')).toBeInTheDocument()
    expect(screen.queryByText('12 meses')).not.toBeInTheDocument()
  })

  it('entrega a resposta à conversa de origem mesmo depois de trocar de conversa', async () => {
    const pending = deferred<Response>()
    fetchMock.mockImplementationOnce(() => pending.promise)
    const user = userEvent.setup()
    renderApp()

    await ask(user, 'Pergunta A')
    await user.click(screen.getByRole('button', { name: '+ Nova conversa' }))
    // A conversa B está livre para perguntar enquanto A aguarda.
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled() // campo vazio
    await user.type(input(), 'Pergunta B')
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeEnabled()
    await user.clear(input())

    pending.resolve(jsonResponse(okBody({ answer: 'Resposta da conversa A.' })))

    await waitFor(() => expect(screen.getByTestId('suggested-questions')).toBeInTheDocument())
    expect(screen.queryByText('Resposta da conversa A.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pergunta A' }))
    expect(await screen.findByText('Resposta da conversa A.')).toBeInTheDocument()
  })

  it('descarta a resposta de uma conversa excluída enquanto aguardava', async () => {
    const pending = deferred<Response>()
    fetchMock.mockImplementationOnce(() => pending.promise)
    const user = userEvent.setup()
    renderApp()

    await ask(user, 'Pergunta A')
    await user.click(screen.getByRole('button', { name: '+ Nova conversa' }))
    await user.click(screen.getByRole('button', { name: 'Excluir conversa Pergunta A' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }))

    pending.resolve(jsonResponse(okBody({ answer: 'Resposta órfã.' })))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(screen.queryByText('Resposta órfã.')).not.toBeInTheDocument()
    expect(sidebarTitles()).toEqual(['Nova conversa'])
  })
})

describe('App: limite do texto (US-11)', () => {
  it('bloqueia o envio acima de 2000 caracteres sem chamar a API', async () => {
    renderApp()
    fireEvent.change(input(), { target: { value: 'a'.repeat(2001) } })

    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled()
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('chat-input-error')).toBeInTheDocument()
  })
})

describe('App: acessibilidade (US-11)', () => {
  it('permite chegar ao campo, ao botão e aos itens da barra lateral só com o teclado', async () => {
    const user = userEvent.setup()
    renderApp()

    const reached = new Set<string>()
    for (let i = 0; i < 12; i++) {
      await user.tab()
      const active = document.activeElement as HTMLElement
      reached.add(active.getAttribute('data-testid') ?? active.tagName)
    }

    expect(reached).toContain('sidebar-new-conversation-button')
    expect(reached).toContain('conversation-item-select-button')
    expect(reached).toContain('suggested-questions-button')
    expect(reached).toContain('chat-input-textarea')
  })

  it('todos os botões têm nome acessível', () => {
    renderApp()
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAccessibleName()
    }
  })
})
