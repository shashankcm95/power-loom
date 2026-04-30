#!/usr/bin/env node

// PreToolUse hook: blocks edits to linter/formatter config files.
// Forces the agent to fix code instead of weakening configurations.

const PROTECTED_PATTERNS = [
  /(?:^|\/)\.eslintrc/i,
  /(?:^|\/)eslint\.config/i,
  /(?:^|\/)\.prettierrc/i,
  /(?:^|\/)prettier\.config/i,
  /(?:^|\/)biome\.jsonc?$/i,
  /(?:^|\/)\.stylelintrc/i,
  /(?:^|\/)tsconfig[^/]*\.json$/i,
  /(?:^|\/)\.editorconfig$/i,
];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolInput = data.tool_input || {};
    const filePath = toolInput.file_path || toolInput.path || '';

    const isProtected = PROTECTED_PATTERNS.some((pattern) => pattern.test(filePath));

    if (isProtected) {
      process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: `Config file "${filePath}" is protected. Fix the code to satisfy the existing config instead of weakening the config.`,
      }));
    } else {
      process.stdout.write(JSON.stringify({ decision: 'approve' }));
    }
  } catch {
    process.stdout.write(JSON.stringify({ decision: 'approve' }));
  }
});
