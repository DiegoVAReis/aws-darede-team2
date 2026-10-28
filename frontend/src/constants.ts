/** Máximo de caracteres (pontos de código) da pergunta, depois de aparar. Igual ao Backend. */
export const MAX_TEXT_LENGTH = 2000
/** A partir daqui o contador "n/2000" aparece. */
export const COUNTER_THRESHOLD = 1800
/** Máximo de caracteres (pontos de código) de um título renomeado. */
export const MAX_TITLE_LENGTH = 60
/** Tamanho do título automático, antes da reticência. */
export const AUTO_TITLE_LENGTH = 40
export const DEFAULT_TITLE = 'Nova conversa'
/** Tempo limite da pergunta. O Backend usa 60 s por chamada ao Bedrock. */
export const REQUEST_TIMEOUT_MS = 90_000

export const STORAGE_KEY = 'anyone-assistant:conversations'
export const STORAGE_VERSION = 1
/** Formato aceito pelo Backend para session_id. */
export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export const DEFAULT_API_BASE_URL = 'http://localhost:8000'

export function resolveApiBaseUrl(envValue: string | undefined): string {
  const value = envValue?.trim()
  return (value ? value : DEFAULT_API_BASE_URL).replace(/\/+$/, '')
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export const SUGGESTED_QUESTIONS: readonly string[] = [
  'Qual a garantia padrão dos tratores?',
  'Como funciona o crédito rural para cooperados?',
  'Quais seguros agrícolas estão disponíveis?',
  'Quais são os primeiros passos de um novo colaborador?',
]

export const CONTEXT_RESET_TEXT =
  'O contexto desta conversa foi reiniciado. Repita as informações importantes, pois o assistente não lembra do que foi dito antes.'

export const STORAGE_WARNING_TEXT =
  'Não foi possível salvar as conversas neste navegador. Elas podem se perder ao recarregar a página.'

export const TOO_LONG_TEXT = `A pergunta passa de ${MAX_TEXT_LENGTH} caracteres. Encurte o texto.`
