import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import fc from 'fast-check'
import { afterEach } from 'vitest'

// PBT-08: o fast-check imprime a seed e o caminho do contraexemplo quando uma propriedade falha.
// Para reproduzir: fc.assert(propriedade, { seed, path }).
fc.configureGlobal({ numRuns: 100 })

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
