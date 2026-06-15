/**
 * Type declarations for central-logger.mjs
 */
export function logTask(options: {
  agent: string
  status: 'active' | 'completed' | 'blocked'
  summary: string
  files?: string[]
  verification?: string
}): Promise<void>

export function logBug(options: {
  agent: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  files?: string[]
  category?: string
}): Promise<void>

export function readTaskLog(limit?: number): Record<string, unknown>[]

export function readBugLog(limit?: number): Record<string, unknown>[]

export function getTaskLogPath(): string

export function getBugLogPath(): string

declare const _default: {
  logTask: typeof logTask
  logBug: typeof logBug
  readTaskLog: typeof readTaskLog
  readBugLog: typeof readBugLog
  getTaskLogPath: typeof getTaskLogPath
  getBugLogPath: typeof getBugLogPath
}
export default _default
