#!/usr/bin/env node

// Stop hook (async): sends a macOS notification when Claude finishes a response.
// Non-blocking — failures are silently ignored.

const { execSync } = require('child_process');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  process.stdout.write(input);

  try {
    const title = 'Claude Code';
    const message = 'Task complete — check your terminal.';
    const script = `display notification "${message}" with title "${title}" sound name "Glass"`;
    execSync(`osascript -e '${script}'`, { timeout: 3000, stdio: 'ignore' });
  } catch {
    // Non-critical — never block on notification failures
  }
});
