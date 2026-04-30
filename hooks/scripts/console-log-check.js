#!/usr/bin/env node

// Stop hook: warns about console.log statements in recently edited files.
// Uses git repo root for absolute path resolution (works in monorepos).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    // Get the git repo root for absolute path resolution
    const repoRoot = execSync('git rev-parse --show-toplevel 2>/dev/null || true', {
      encoding: 'utf8',
      timeout: 5000,
    }).trim();

    if (!repoRoot) {
      process.stdout.write(input);
      return;
    }

    const changedFiles = execSync('git diff --name-only HEAD 2>/dev/null || true', {
      encoding: 'utf8',
      timeout: 5000,
    })
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((f) => path.resolve(repoRoot, f))
      .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f) && fs.existsSync(f));

    const filesWithConsoleLog = [];

    for (const file of changedFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/console\.log\(/.test(lines[i]) && !/\/\/\s*eslint-disable/.test(lines[i])) {
          // Use relative path for cleaner display
          const relPath = path.relative(repoRoot, file);
          filesWithConsoleLog.push(`  ${relPath}:${i + 1}`);
          break;
        }
      }
    }

    if (filesWithConsoleLog.length > 0) {
      const warning = `\n\n⚠ console.log detected in edited files:\n${filesWithConsoleLog.join('\n')}\nRemove before committing.`;
      process.stdout.write(input + warning);
    } else {
      process.stdout.write(input);
    }
  } catch {
    process.stdout.write(input);
  }
});
