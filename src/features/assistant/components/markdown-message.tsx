import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Assistant answers rendered as GitHub-flavoured markdown (tables, lists, code).
 * react-markdown does not render raw HTML unless rehype-raw is added, so model output stays inert.
 */
export function MarkdownMessage({ text }: { text: string }) {
  return (
    <div className="space-y-2 break-words text-[13.5px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          h1: ({ children }) => <p className="text-sm font-semibold text-ink">{children}</p>,
          h2: ({ children }) => <p className="text-sm font-semibold text-ink">{children}</p>,
          h3: ({ children }) => <p className="text-sm font-semibold text-ink">{children}</p>,
          ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="marker:text-plum">{children}</li>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-plum underline">{children}</a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-plum-soft pl-3 text-muted">{children}</blockquote>
          ),
          code: ({ className, children }) =>
            className?.includes('language-') ? (
              <code className="block overflow-x-auto rounded-lg bg-field p-2 font-mono text-[12px]">{children}</code>
            ) : (
              <code className="rounded bg-plum-soft px-1 py-0.5 font-mono text-[12px] text-plum-dark">{children}</code>
            ),
          pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
          hr: () => <hr className="border-border" />,
          // Tables scroll sideways instead of stretching the bubble on narrow screens.
          table: ({ children }) => (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-plum-soft/60">{children}</thead>,
          th: ({ children }) => (
            <th className="whitespace-nowrap border border-border px-2 py-1 text-left font-semibold text-ink">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
