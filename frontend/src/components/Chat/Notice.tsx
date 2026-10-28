import type { ReactNode } from 'react'
import styles from './Notice.module.css'

interface NoticeProps {
  kind: 'contextReset' | 'storage'
  children: ReactNode
}

/** Aviso discreto (BR-CTX-01, BR-PER-06). */
export function Notice({ kind, children }: NoticeProps) {
  return (
    <div className={styles.notice} role="status" data-testid={`notice-${kind}`}>
      {children}
    </div>
  )
}
