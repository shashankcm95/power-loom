// Shared logging helper for all hook scripts.
// Writes one JSON line per event to ~/.claude/logs/{hookName}.log
//
// Usage:
//   const { log } = require('./_log.js');
//   const logger = log('fact-force-gate');
//   logger('invoked', { toolName, filePath });
//
// Disable globally with CLAUDE_HOOKS_QUIET=1.
// Logs are append-only, lightweight, never block on failure.

const fs = require('fs');
const path = require('path');
const os = require('os');

const QUIET = process.env.CLAUDE_HOOKS_QUIET === '1';
const LOG_DIR = path.join(os.homedir(), '.claude', 'logs');

function log(hookName) {
  const logFile = path.join(LOG_DIR, `${hookName}.log`);

  return function (event, details) {
    if (QUIET) return;
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      const safe = details === undefined ? {} : details;
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${event}: ${JSON.stringify(safe)}\n`);
    } catch { /* never block on logging failures */ }
  };
}

module.exports = { log };
