/** Strips HTML tags and trims to a plain-text excerpt for article/blog cards. */
export function excerptFromHtml(html: string | null | undefined, length = 160): string {
  if (!html) return ''
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.length <= length) return text
  return text.slice(0, length).trimEnd() + '…'
}
