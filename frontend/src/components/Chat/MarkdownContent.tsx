import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from './MarkdownContent.module.css'

const SAFE_LINK = /^https?:\/\//i

// BR-UI-05 e BR-UI-06: só links http(s) em nova aba; imagens nunca são carregadas.
const components: Components = {
  a({ href, children }) {
    if (href && SAFE_LINK.test(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      )
    }
    return <span>{children}</span>
  },
  img({ alt }) {
    return <span>{alt ?? ''}</span>
  },
}

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className={styles.markdown} data-testid="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
