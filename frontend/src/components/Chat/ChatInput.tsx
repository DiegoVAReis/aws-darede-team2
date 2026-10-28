import { useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { COUNTER_THRESHOLD, MAX_TEXT_LENGTH, TOO_LONG_TEXT } from '../../constants'
import { validateQuestion } from '../../state/questionValidation'
import styles from './ChatInput.module.css'

interface ChatInputProps {
  onSend: (text: string) => void
  /** A conversa ativa aguarda resposta: o envio fica bloqueado, a digitação não. */
  disabled: boolean
  textareaRef?: RefObject<HTMLTextAreaElement>
}

export function ChatInput({ onSend, disabled, textareaRef }: ChatInputProps) {
  // BR-ENV-13: o rascunho fica no campo ao trocar de conversa e não é persistido.
  const [draft, setDraft] = useState('')
  const validation = validateQuestion(draft)
  const tooLong = !validation.ok && validation.reason === 'too_long'
  const showCounter = validation.length >= COUNTER_THRESHOLD
  const canSend = validation.ok && !disabled

  const submit = () => {
    if (!validation.ok || disabled) return
    onSend(validation.text)
    setDraft('')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
  }

  // BR-ENV-05: Enter envia; Shift+Enter quebra a linha; Enter durante a composição (IME) não envia.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} data-testid="chat-input-form">
      <div className={styles.row}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={draft}
          rows={2}
          placeholder="Digite sua pergunta"
          aria-label="Digite sua pergunta"
          aria-invalid={tooLong}
          aria-describedby={tooLong ? 'chat-input-error' : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          data-testid="chat-input-textarea"
        />
        <button
          type="submit"
          className={styles.send}
          disabled={!canSend}
          aria-label="Enviar pergunta"
          data-testid="chat-input-send-button"
        >
          Enviar
        </button>
      </div>
      <div className={styles.meta}>
        {tooLong ? (
          <span id="chat-input-error" className={styles.error} data-testid="chat-input-error">
            {TOO_LONG_TEXT}
          </span>
        ) : (
          <span className={styles.hint}>Enter envia · Shift+Enter quebra a linha</span>
        )}
        {showCounter && (
          <span className={tooLong ? styles.error : styles.counter} data-testid="chat-input-counter">
            {validation.length}/{MAX_TEXT_LENGTH}
          </span>
        )}
      </div>
    </form>
  )
}
