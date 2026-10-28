import type { SourceRef } from '../../types'
import styles from './SourceList.module.css'

interface SourceListProps {
  sources: SourceRef[]
}

/** BR-UI-02 e BR-UI-03: título H1 em destaque e arquivo em texto menor; nada se não houver fontes. */
export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) return null
  return (
    <div className={styles.sources} role="group" aria-label="Fontes" data-testid="source-list">
      <p className={styles.label}>Fontes</p>
      <ul className={styles.list}>
        {sources.map((source) => (
          <li key={source.file} className={styles.item} data-testid="source-list-item">
            {source.title ? (
              <>
                <span className={styles.title}>{source.title}</span>
                <span className={styles.file}>{source.file}</span>
              </>
            ) : (
              <span className={styles.title}>{source.file}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
