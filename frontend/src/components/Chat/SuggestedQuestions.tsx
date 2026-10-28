import styles from './SuggestedQuestions.module.css'

interface SuggestedQuestionsProps {
  questions: readonly string[]
  onSelect: (question: string) => void
}

/** BR-CNV-12 e BR-CNV-13: sugestões na tela inicial de uma conversa vazia. */
export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <section className={styles.suggestions} aria-labelledby="suggested-questions-heading" data-testid="suggested-questions">
      <h2 id="suggested-questions-heading" className={styles.heading}>
        Como posso ajudar?
      </h2>
      <p className={styles.hint}>Pergunte sobre máquinas, crédito, seguros, onboarding e outros temas da base interna.</p>
      <ul className={styles.list}>
        {questions.map((question) => (
          <li key={question}>
            <button
              type="button"
              className={styles.button}
              onClick={() => onSelect(question)}
              data-testid="suggested-questions-button"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
