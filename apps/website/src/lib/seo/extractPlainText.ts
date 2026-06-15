/** Walks a Lexical richText JSON value and concatenates its text nodes. */
export function extractPlainText(value: unknown): string {
  if (!value || typeof value !== 'object') return ''

  const root = (value as { root?: { children?: unknown[] } }).root
  if (!root?.children) return ''

  const parts: string[] = []
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      const n = node as { type?: string; text?: string; children?: unknown[] }
      if (typeof n.text === 'string') parts.push(n.text)
      if (Array.isArray(n.children)) walk(n.children)
    }
  }
  walk(root.children)

  return parts.join(' ')
}
