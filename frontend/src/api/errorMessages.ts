import type { ErrorKind } from '../types'

/** BR-ERR-01: textos fixos em português. O `message` da API nunca é exibido. */
export const ERROR_TEXTS: Record<ErrorKind, string> = {
  VALIDATION_ERROR: 'Não consegui processar essa pergunta. Confira o texto e tente de novo.',
  KB_NOT_INDEXED:
    'A base de conhecimento ainda não foi indexada. Peça ao responsável para executar a ingestão.',
  UPSTREAM_ERROR: 'O serviço de IA não respondeu agora. Tente novamente em instantes.',
  INTERNAL_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
  NETWORK: 'Não consegui falar com o assistente. Verifique se o backend está em execução.',
  TIMEOUT: 'A resposta demorou demais. Tente novamente.',
  UNEXPECTED_RESPONSE: 'Recebi uma resposta que não consegui entender. Tente novamente.',
  NO_RESPONSE: 'A resposta não foi recebida. Tente novamente.',
}

export const ERROR_KINDS = Object.keys(ERROR_TEXTS) as ErrorKind[]

export function errorText(kind: ErrorKind): string {
  return ERROR_TEXTS[kind]
}
