import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SUGGESTED_QUESTIONS } from '../../constants'
import { SuggestedQuestions } from './SuggestedQuestions'

describe('SuggestedQuestions', () => {
  it('mostra uma sugestão por tema da base', () => {
    render(<SuggestedQuestions questions={SUGGESTED_QUESTIONS} onSelect={() => {}} />)
    expect(screen.getAllByTestId('suggested-questions-button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: /tratores/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crédito rural/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /seguros agrícolas/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /novo colaborador/ })).toBeInTheDocument()
  })

  it('chama onSelect com o texto da sugestão clicada', async () => {
    const onSelect = vi.fn()
    render(<SuggestedQuestions questions={SUGGESTED_QUESTIONS} onSelect={onSelect} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /crédito rural/ }))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('Como funciona o crédito rural para cooperados?')
  })
})
