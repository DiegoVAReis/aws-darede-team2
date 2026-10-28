import styles from './LoadingIndicator.module.css'

export function LoadingIndicator() {
  return (
    <div className={styles.loading} role="status" data-testid="loading-indicator">
      <span className={styles.dots} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>Aguardando resposta…</span>
    </div>
  )
}
