/**
 * Converts a Lexical JSON tree (as stored in the description/content JSONB
 * columns) into an HTML string for rendering in the storefront.
 *
 * Supported node types:
 *   root, paragraph, heading, text, list, listitem, link, youtube, linebreak
 *
 * YouTube nodes (type: "youtube", videoId: "...") render as responsive iframes.
 */

interface LexicalNode {
  type: string
  version?: number
  text?: string
  format?: number | string
  tag?: string
  listType?: string
  children?: LexicalNode[]
  url?: string
  videoId?: string
  indent?: number
  direction?: string
}

/** Bitmask values matching Lexical's TextFormatType */
const IS_BOLD       = 1
const IS_ITALIC     = 2
const IS_STRIKETHROUGH = 4
const IS_UNDERLINE  = 8
const IS_CODE       = 16

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderNode(node: LexicalNode): string {
  switch (node.type) {
    case 'root':
      return (node.children || []).map(renderNode).join('')

    case 'paragraph': {
      const inner = (node.children || []).map(renderNode).join('')
      return inner ? `<p>${inner}</p>` : '<br>'
    }

    case 'heading': {
      const tag = node.tag || 'h2'
      const inner = (node.children || []).map(renderNode).join('')
      return `<${tag}>${inner}</${tag}>`
    }

    case 'text': {
      let content = escapeHtml(node.text || '')
      const fmt = typeof node.format === 'number' ? node.format : 0
      if (fmt & IS_CODE)          content = `<code>${content}</code>`
      if (fmt & IS_BOLD)          content = `<strong>${content}</strong>`
      if (fmt & IS_ITALIC)        content = `<em>${content}</em>`
      if (fmt & IS_UNDERLINE)     content = `<u>${content}</u>`
      if (fmt & IS_STRIKETHROUGH) content = `<s>${content}</s>`
      return content
    }

    case 'linebreak':
      return '<br>'

    case 'link': {
      const href = escapeHtml(node.url || '#')
      const inner = (node.children || []).map(renderNode).join('')
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${inner}</a>`
    }

    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul'
      const items = (node.children || []).map(renderNode).join('')
      return `<${tag}>${items}</${tag}>`
    }

    case 'listitem': {
      const inner = (node.children || []).map(renderNode).join('')
      return `<li>${inner}</li>`
    }

    case 'html': {
      const raw = (node as any).html || ''
      return raw
    }

    case 'youtube': {
      const id = escapeHtml(node.videoId || '')
      if (!id) return ''
      return `<div class="yt-embed-wrap"><iframe
        src="https://www.youtube.com/embed/${id}"
        title="YouTube video player"
        width="560" height="315"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
      ></iframe></div>`
    }

    default:
      // Unknown node — render children if any
      return (node.children || []).map(renderNode).join('')
  }
}

/**
 * Renders a Lexical JSON value (object or JSON string) to an HTML string.
 * Returns empty string if value is null/undefined/empty.
 */
export function renderLexical(value: unknown): string {
  if (!value) return ''

  // Most descriptions are stored as raw HTML strings (imported from Shopify),
  // not Lexical JSON. Only values that look like JSON ({...} / [...]) should be
  // parsed; anything else is already HTML and is returned verbatim.
  if (typeof value === 'string') {
    const t = value.trim()
    if (!(t.startsWith('{') || t.startsWith('['))) {
      return value
    }
  }

  try {
    const tree: LexicalNode = typeof value === 'string' ? JSON.parse(value) : (value as LexicalNode)
    return renderNode(tree)
  } catch {
    // Parse failed — treat the original string as raw HTML rather than
    // escaping it (escaping would render tags as visible text).
    return typeof value === 'string' ? value : ''
  }
}
