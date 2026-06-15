/**
 * Central Logger for HomeU Commerce
 * 
 * Unified logging utility for all coding extensions to log to the centralized
 * task-log.jsonl and bug-log.jsonl files.
 * 
 * Usage:
 *   import { logTask, logBug } from './tools/shared/central-logger.mjs';
 *   
 *   // Log a task update
 *   await logTask({
 *     agent: 'your-agent-name',
 *     status: 'active', // active, completed, blocked
 *     summary: 'What was done or is in progress',
 *     files: ['file1.js', 'file2.md'],
 *     verification: 'How this was verified'
 *   });
 *   
 *   // Log a bug
 *   await logBug({
 *     agent: 'your-agent-name',
 *     status: 'found', // found, fixed
 *     summary: 'Bug description',
 *     files: ['buggy-file.js'],
 *     verification: 'How it was verified'
 *   });
 */

import { appendFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths to centralized log files
const TASK_LOG_PATH = join(__dirname, '../../memory/task-log.jsonl');
const BUG_LOG_PATH = join(__dirname, '../../memory/bug-log.jsonl');

/**
 * Get current ISO timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Log a task update to the centralized task-log.jsonl
 * @param {Object} params - Task log parameters
 * @param {string} params.agent - Agent name (blackbox, codex, kilo-code, claude, deployer, etc.)
 * @param {string} params.status - Status: active, completed, blocked
 * @param {string} params.summary - What was done or is in progress
 * @param {string[]} params.files - Array of file paths affected
 * @param {string} params.verification - How this was verified (tests, commands, etc.)
 */
export async function logTask({ agent, status, summary, files = [], verification = '' }) {
  const entry = {
    timestamp: getTimestamp(),
    agent,
    status,
    summary,
    files,
    verification
  };
  
  const line = JSON.stringify(entry) + '\n';
  
  try {
    appendFileSync(TASK_LOG_PATH, line, { encoding: 'utf8' });
    console.log(`[central-logger] Task logged: ${agent} - ${status}`);
    return { success: true, entry };
  } catch (error) {
    console.error(`[central-logger] Failed to log task:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Log a bug to the centralized bug-log.jsonl
 * @param {Object} params - Bug log parameters
 * @param {string} params.agent - Agent name
 * @param {string} params.status - Status: found, fixed
 * @param {string} params.summary - Bug description
 * @param {string[]} params.files - Array of file paths involved
 * @param {string} params.verification - How it was verified/fixed
 */
export async function logBug({ agent, status, summary, files = [], verification = '' }) {
  const entry = {
    timestamp: getTimestamp(),
    agent,
    status,
    summary,
    files,
    verification
  };
  
  const line = JSON.stringify(entry) + '\n';
  
  try {
    appendFileSync(BUG_LOG_PATH, line, { encoding: 'utf8' });
    console.log(`[central-logger] Bug logged: ${agent} - ${status}`);
    return { success: true, entry };
  } catch (error) {
    console.error(`[central-logger] Failed to log bug:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Read recent entries from task log
 * @param {number} limit - Number of entries to read (default: 5)
 */
export function readTaskLog(limit = 5) {
  return readLogEntries(TASK_LOG_PATH, limit);
}

/**
 * Read recent entries from bug log
 * @param {number} limit - Number of entries to read (default: 5)
 */
export function readBugLog(limit = 5) {
  return readLogEntries(BUG_LOG_PATH, limit);
}

/**
 * Internal function to read log entries
 */
function readLogEntries(path, limit) {
  if (!existsSync(path)) {
    return [];
  }
  
  try {
    const content = readFileSync(path, { encoding: 'utf8' });
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    // Return last N entries (most recent)
    return lines.slice(-limit).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error(`[central-logger] Failed to read log:`, error.message);
    return [];
  }
}

/**
 * Get task log path for external tools
 */
export function getTaskLogPath() {
  return TASK_LOG_PATH;
}

/**
 * Get bug log path for external tools
 */
export function getBugLogPath() {
  return BUG_LOG_PATH;
}

export default {
  logTask,
  logBug,
  readTaskLog,
  readBugLog,
  getTaskLogPath,
  getBugLogPath
};
