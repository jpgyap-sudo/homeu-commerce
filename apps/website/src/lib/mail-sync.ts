/** Return the inclusive IMAP sequence range for the newest messages. */
export function getLatestSequenceRange(messageCount: number, limit: number): string | null {
  if (!Number.isInteger(messageCount) || messageCount <= 0 || !Number.isInteger(limit) || limit <= 0) {
    return null
  }

  const start = Math.max(1, messageCount - limit + 1)
  return `${start}:${messageCount}`
}
