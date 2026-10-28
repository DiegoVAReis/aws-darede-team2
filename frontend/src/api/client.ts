import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../constants'
import type { ApiErrorKind, AskResponse, SourceRef } from '../types'

/** Erro lançado pelo cliente da API. Não carrega o `message` da API (BR-ERR-01). */
export class ApiRequestError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number

  constructor(kind: ApiErrorKind, status?: number) {
    super(kind)
    this.name = 'ApiRequestError'
    this.kind = kind
    if (status !== undefined) this.status = status
  }
}

export interface AskOptions {
  /** Cancelamento externo. Quando dispara, a chamada termina com AbortError (não é erro de tempo). */
  signal?: AbortSignal
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

const API_ERROR_CODES: readonly ApiErrorKind[] = [
  'VALIDATION_ERROR',
  'KB_NOT_INDEXED',
  'UPSTREAM_ERROR',
  'INTERNAL_ERROR',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSourceRef(value: unknown): value is SourceRef {
  return isRecord(value) && typeof value.file === 'string' && typeof value.title === 'string'
}

/** BR-ERR-02: valida a resposta de sucesso. Devolve null se estiver fora do contrato. */
export function parseAskResponse(body: unknown): AskResponse | null {
  if (!isRecord(body)) return null
  const { answer, sources, session_id, session_reset } = body
  if (typeof answer !== 'string' || answer.trim() === '') return null
  if (!Array.isArray(sources) || !sources.every(isSourceRef)) return null
  if (typeof session_id !== 'string') return null
  if (typeof session_reset !== 'boolean') return null
  return {
    answer,
    sources: sources.map((s) => ({ file: s.file, title: s.title })),
    session_id,
    session_reset,
  }
}

/** BR-ERR-02: classifica o corpo de um erro HTTP. */
export function classifyErrorBody(body: unknown): ApiErrorKind {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.code === 'string') {
    const code = body.error.code
    return (API_ERROR_CODES as readonly string[]).includes(code)
      ? (code as ApiErrorKind)
      : 'INTERNAL_ERROR'
  }
  return 'UNEXPECTED_RESPONSE'
}

function abortError(): DOMException {
  return new DOMException('A chamada foi cancelada.', 'AbortError')
}

/** POST /v1/ask. Todas as falhas viram ApiRequestError, exceto o cancelamento externo. */
export async function askQuestion(
  text: string,
  sessionId: string,
  options: AskOptions = {},
): Promise<AskResponse> {
  const {
    signal,
    baseUrl = API_BASE_URL,
    timeoutMs = REQUEST_TIMEOUT_MS,
    fetchImpl = (input, init) => fetch(input, init),
  } = options

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const onExternalAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onExternalAbort, { once: true })
  }

  const failure = (error: unknown, fallback: ApiErrorKind): Error => {
    if (timedOut) return new ApiRequestError('TIMEOUT')
    if (signal?.aborted) return abortError()
    return error instanceof ApiRequestError ? error : new ApiRequestError(fallback)
  }

  try {
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/v1/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, session_id: sessionId }),
        signal: controller.signal,
      })
    } catch (error) {
      throw failure(error, 'NETWORK')
    }

    let body: unknown
    try {
      body = await response.json()
    } catch (error) {
      if (timedOut || signal?.aborted) throw failure(error, 'UNEXPECTED_RESPONSE')
      body = undefined
    }

    if (!response.ok) {
      throw new ApiRequestError(classifyErrorBody(body), response.status)
    }
    const parsed = parseAskResponse(body)
    if (!parsed) throw new ApiRequestError('UNEXPECTED_RESPONSE', response.status)
    return parsed
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onExternalAbort)
  }
}
