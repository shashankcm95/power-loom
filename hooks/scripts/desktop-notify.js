#!/usr/bin/env node

// Stop hook (async): sends a desktop notification when Claude finishes a response.
// Non-blocking — failures are silently ignored.
// Cross-platform: macOS (osascript), Linux (notify-send), Windows/WSL skipped.
//
// Skips notification if Claude Code's terminal is already the focused app.

const { execSync } = require('child_process');
const { isClaudeFocused } = require('./_focus.js');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  process.stdout.write(input);

  try {
    // Skip notification if user is actively watching Claude Code
    if (isClaudeFocused()) {
      return;
    }

    const title = 'Claude Code';
    const message = 'Task complete — check your terminal.';
    const platform = process.platform;

    if (platform === 'darwin') {
      const script = `display notification "${message}" with title "${title}" sound name "Glass"`;
      execSync(`osascript -e '${script}'`, { timeout: 3000, stdio: 'ignore' });
    } else if (platform === 'linux') {
      execSync(`notify-send "${title}" "${message}" -u low`, { timeout: 3000, stdio: 'ignore' });
    }
    // Windows / WSL / other: silently skip
  } catch {
    // Non-critical — never block on notification failures
  }
});
