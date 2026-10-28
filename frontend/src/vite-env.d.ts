/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API. Opcional. Não pode conter credenciais: variáveis VITE_* são públicas. */
  readonly VITE_API_BASE_URL?: string
}
