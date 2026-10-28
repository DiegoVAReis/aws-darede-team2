import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, askQuestion, classifyErrorBody, parseAskResponse } from './client'

const OK_BODY = {
  answer: 'Garantia de **12 meses**.',
  sources: [{ file: 'maquinas_agricolas_catalogo.md', title: 'UN Máquinas — Catálogo' }],
  session_id: 'abc',
  session_reset: false,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiRequestError) return error.kind
    throw error
  }
  throw new Error('Era esperado um erro')
}

afterEach(() => {
  vi.useRealTimers()
})

describe('askQuestion', () => {
  it('envia text e session_id e devolve a resposta validada', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(OK_BODY))
    const result = await askQuestion('E a garantia?', 'sess-1', {
      baseUrl: 'http://api.test',
      fetchImpl,
    })

    expect(result).toEqual(OK_BODY)
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://api.test/v1/ask')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ text: 'E a garantia?', session_id: 'sess-1' })
  })

  it.each([
    ['VALIDATION_ERROR', 422],
    ['KB_NOT_INDEXED', 503],
    ['UPSTREAM_ERROR', 502],
    ['INTERNAL_ERROR', 500],
  ])('classifica %s (HTTP %i) pelo código do corpo', async (code, status) => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code, message: 'detalhe interno' } }, status))
    expect(await kindOf(askQuestion('x', 's', { fetchImpl }))).toBe(code)
  })

  it('trata código desconhecido como INTERNAL_ERROR', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: 'OUTRO', message: 'm' } }, 418))
    expect(await kindOf(askQuestion('x', 's', { fetchImpl }))).toBe('INTERNAL_ERROR')
  })

  it('não leva o message da API para o erro', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: 'UPSTREAM_ERROR', message: 'segredo' } }, 502))
    await expect(askQuestion('x', 's', { fetchImpl })).rejects.toSatisfy(
      (error: ApiRequestError) => !error.message.includes('segredo'),
    )
  })

  it('classifica corpo de erro ilegível como UNEXPECTED_RESPONSE', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>erro</html>', { status: 500 }))
    expect(await kindOf(askQuestion('x', 's', { fetchImpl }))).toBe('UNEXPECTED_RESPONSE')
  })

  it('classifica sucesso fora do contrato como UNEXPECTED_RESPONSE', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ answer: '', sources: [] }))
    expect(await kindOf(askQuestion('x', 's', { fetchImpl }))).toBe('UNEXPECTED_RESPONSE')
  })

  it('classifica falha de rede como NETWORK', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await kindOf(askQuestion('x', 's', { fetchImpl }))).toBe('NETWORK')
  })

  it('cancela e classifica como TIMEOUT quando o tempo estoura', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('abortado', 'AbortError')),
        )
      })
    })
    const pending = kindOf(askQuestion('x', 's', { fetchImpl, timeoutMs: 90_000 }))
    await vi.advanceTimersByTimeAsync(90_000)
    expect(await pending).toBe('TIMEOUT')
  })

  it('termina com AbortError (sem classificar como tempo) no cancelamento externo', async () => {
    const external = new AbortController()
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('abortado', 'AbortError')),
        )
      })
    })
    const pending = askQuestion('x', 's', { fetchImpl, signal: external.signal })
    external.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('parseAskResponse', () => {
  it('aceita o contrato completo', () => {
    expect(parseAskResponse(OK_BODY)).toEqual(OK_BODY)
  })

  it.each([
    ['null', null],
    ['sem answer', { ...OK_BODY, answer: undefined }],
    ['answer vazio', { ...OK_BODY, answer: '  ' }],
    ['sources inválido', { ...OK_BODY, sources: [{ file: 1, title: 'x' }] }],
    ['sem session_id', { ...OK_BODY, session_id: 3 }],
    ['session_reset não booleano', { ...OK_BODY, session_reset: 'false' }],
  ])('rejeita %s', (_name, body) => {
    expect(parseAskResponse(body)).toBeNull()
  })
})

describe('classifyErrorBody', () => {
  it('reconhece os códigos conhecidos', () => {
    expect(classifyErrorBody({ error: { code: 'KB_NOT_INDEXED', message: 'x' } })).toBe(
      'KB_NOT_INDEXED',
    )
  })

  it('devolve UNEXPECTED_RESPONSE fora do formato de erro', () => {
    expect(classifyErrorBody({ detail: 'x' })).toBe('UNEXPECTED_RESPONSE')
    expect(classifyErrorBody(undefined)).toBe('UNEXPECTED_RESPONSE')
  })
})
