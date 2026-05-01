#!/usr/bin/env node

// Stop hook (async): sends a desktop notification when Claude finishes a response.
// Non-blocking — failures are silently ignored.
// Cross-platform: macOS (osascript), Linux (notify-send), Windows/WSL skipped.
//
// Skips notification if Claude Code's terminal is already the focused app.

const { execSync } = require('child_process');
const { isClaudeFocused } = require('./_focus.js');
const { log } = require('./_log.js');
const logger = log('desktop-notify');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  process.stdout.write(input);
  logger('invoked', {});

  try {
    if (isClaudeFocused()) {
      logger('skipped', { reason: 'claude_focused' });
      return;
    }

    const title = 'Claude Code';
    const message = 'Task complete — check your terminal.';
    const platform = process.platform;

    if (platform === 'darwin') {
      const script = `display notification "${message}" with title "${title}" sound name "Glass"`;
      execSync(`osascript -e '${script}'`, { timeout: 3000, stdio: 'ignore' });
      logger('sent', { platform });
    } else if (platform === 'linux') {
      execSync(`notify-send "${title}" "${message}" -u low`, { timeout: 3000, stdio: 'ignore' });
      logger('sent', { platform });
    } else {
      logger('skipped', { reason: 'unsupported_platform', platform });
    }
  } catch (err) {
    logger('error', { error: err.message });
  }
});
